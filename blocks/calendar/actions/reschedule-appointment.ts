// blocks/calendar/actions/reschedule-appointment.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { google } from 'googleapis'
import { revalidatePath } from 'next/cache'
import {
  sendNotification,
  formatFechaArgentina,
  type NegocioNotificationData,
} from '@/lib/notifications'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Verificar Autenticación ─────────────────────────────────────────────────

async function getAuthenticatedNegocioId(): Promise<number | null> {
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return null

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id')
    .eq('user_id', user.id)
    .single()

  return negocio?.id ?? null
}

// ─── Acción Principal ────────────────────────────────────────────────────────

export interface RescheduleAppointmentResult {
  success: boolean;
  error?: string;
}

/**
 * Reagenda un turno a una nueva fecha/hora.
 * Actualiza el evento en Google Calendar y notifica al cliente.
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newStart: string,
  newEnd: string
): Promise<RescheduleAppointmentResult> {
  try {
    // ═══ 1. VERIFICAR AUTENTICACIÓN ═══════════════════════════════════════════
    const negocioId = await getAuthenticatedNegocioId()
    if (negocioId === null) {
      return { success: false, error: 'No autorizado' }
    }

    // ═══ 2. OBTENER TURNO Y NEGOCIO ═══════════════════════════════════════════
    const { data: turno, error: turnoError } = await supabase
      .from('turnos')
      .select('*, negocios(*)')
      .eq('id', appointmentId)
      .single()

    if (turnoError || !turno) {
      return { success: false, error: 'Turno no encontrado' }
    }

    if (turno.negocio_id !== negocioId) {
      return { success: false, error: 'No autorizado' }
    }

    const negocio = turno.negocios as any
    if (!negocio?.google_refresh_token) {
      return { success: false, error: 'Google Calendar no está conectado' }
    }

    const configWeb = negocio.config_web || {}

    // ═══ 3. AUTH CON GOOGLE ═══════════════════════════════════════════════════
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    // ═══ 4. VERIFICAR DISPONIBILIDAD DEL NUEVO HORARIO ════════════════════════
    const availabilityMode = configWeb.equipo?.availabilityMode || 'global'
    
    const conflictCheck = await calendar.events.list({
      calendarId: 'primary',
      timeMin: newStart,
      timeMax: newEnd,
      singleEvents: true,
      timeZone: 'America/Argentina/Buenos_Aires',
    })

    if (conflictCheck.data.items) {
      // Extraer profesional del servicio
      const parts = turno.servicio?.split(' - ') || []
      const workerName = parts.length > 1 ? parts[parts.length - 1] : null
      const targetWorker = configWeb.equipo?.items?.find((w: any) => w.nombre === workerName)
      const targetWorkerId = targetWorker ? String(targetWorker.id) : null

      for (const event of conflictCheck.data.items) {
        // Ignorar el mismo evento que estamos moviendo
        if (event.id === turno.google_event_id) continue
        if (event.transparency === 'transparent') continue
        if (event.status === 'cancelled') continue

        const shared = (event.extendedProperties?.shared as any) || {}
        const eventWorkerId = shared['saas_worker_id']?.trim() || null

        let hayConflicto = false

        if (availabilityMode === 'global' || availabilityMode === 'sala_unica') {
          hayConflicto = true
        } else {
          if (!eventWorkerId || (targetWorkerId && eventWorkerId === targetWorkerId)) {
            hayConflicto = true
          }
        }

        if (hayConflicto) {
          return { 
            success: false, 
            error: 'El nuevo horario no está disponible' 
          }
        }
      }
    }

    // ═══ 5. ACTUALIZAR EN GOOGLE CALENDAR ═════════════════════════════════════
    if (turno.google_event_id) {
      try {
        await calendar.events.patch({
          calendarId: 'primary',
          eventId: turno.google_event_id,
          requestBody: {
            start: { dateTime: newStart, timeZone: 'America/Argentina/Buenos_Aires' },
            end: { dateTime: newEnd, timeZone: 'America/Argentina/Buenos_Aires' },
          },
        })
      } catch (gError) {
        console.error('[CALENDAR] Error updating Google event:', gError)
        // Continuar aunque falle Google (el turno se actualiza igual en DB)
      }
    }

    // ═══ 6. ACTUALIZAR EN SUPABASE ════════════════════════════════════════════
    const { error: updateError } = await supabase
      .from('turnos')
      .update({
        fecha_inicio: newStart,
        fecha_fin: newEnd,
        recordatorio_enviado: false, // Reset para que envíe nuevo recordatorio
      })
      .eq('id', appointmentId)

    if (updateError) throw updateError

    // ═══ 7. ENVIAR NOTIFICACIONES ═════════════════════════════════════════════
    const { fecha, hora } = formatFechaArgentina(newStart)

    const negocioNotif: NegocioNotificationData = {
      id: negocio.id,
      nombre: negocio.nombre,
      slug: negocio.slug,
      email: negocio.email_contacto,
      telefono: negocio.telefono_contacto,
      google_refresh_token: negocio.google_refresh_token,
      google_access_token: negocio.google_access_token,
      whatsapp_access_token: negocio.whatsapp_access_token,
      config_web: configWeb,
    }

    // Notificar al cliente: turno reagendado
    await sendNotification({
      event: 'turno_reagendado',
      recipient: {
        type: 'cliente',
        nombre: turno.cliente_nombre,
        email: turno.cliente_email,
        telefono: turno.cliente_telefono,
      },
      negocio: negocioNotif,
      variables: {
        cliente: turno.cliente_nombre,
        servicio: turno.servicio,
        fecha,
        hora,
      },
    })

    // ═══ 8. REVALIDAR Y RETORNAR ══════════════════════════════════════════════
    revalidatePath('/dashboard')

    return { success: true }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[CALENDAR] Error rescheduling appointment:', error)
    return { success: false, error: message }
  }
}