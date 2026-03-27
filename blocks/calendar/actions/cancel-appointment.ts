// blocks/calendar/actions/cancel-appointment.ts
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

export interface CancelAppointmentResult {
  success: boolean;
  error?: string;
}

/**
 * Cancela un turno existente.
 * Elimina el evento de Google Calendar si existe y notifica al cliente.
 */
export async function cancelAppointment(appointmentId: string): Promise<CancelAppointmentResult> {
  try {
    // ═══ 1. VERIFICAR AUTENTICACIÓN ═══════════════════════════════════════════
    const negocioId = await getAuthenticatedNegocioId()
    if (negocioId === null) {
      return { success: false, error: 'No autorizado' }
    }

    // ═══ 2. OBTENER TURNO Y NEGOCIO ═══════════════════════════════════════════
    const { data: turno, error: turnoError } = await supabase
    .from('turnos')
    .select('*, negocios(*)')    // ← JOIN correcto desde turnos
    .eq('id', appointmentId)
    .single()

    if (turnoError || !turno) {
      return { success: false, error: 'Turno no encontrado' }
    }

    if (turno.negocio_id !== negocioId) {
      return { success: false, error: 'No autorizado' }
    }
    
    const negocio = turno.negocios 

   
    
    

    // ═══ 3. ELIMINAR DE GOOGLE CALENDAR ═══════════════════════════════════════
    if (turno.google_event_id && negocio?.google_refresh_token) {
      try {
        const auth = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        )
        auth.setCredentials({ refresh_token: negocio.google_refresh_token })
        const calendar = google.calendar({ version: 'v3', auth })

        await calendar.events.delete({
          calendarId: 'primary',
          eventId: turno.google_event_id,
        })
      } catch (gError) {
        // El evento puede ya haber sido eliminado manualmente
        console.warn('[CALENDAR] Evento ya borrado en Google:', gError)
      }
    }

    // ═══ 4. ACTUALIZAR ESTADO EN SUPABASE ═════════════════════════════════════
    const { error: updateError } = await supabase
      .from('turnos')
      .update({ estado: 'cancelado' })
      .eq('id', appointmentId)

    if (updateError) throw updateError

    // ═══ 5. ENVIAR NOTIFICACIONES ═════════════════════════════════════════════
    const { fecha, hora } = formatFechaArgentina(turno.fecha_inicio)

    const negocioNotif: NegocioNotificationData = {
      id: turno.negocio_id,
      nombre: negocio?.nombre || '',
      slug: negocio?.slug || '',
      email: negocio?.email_contacto,
      telefono: negocio?.telefono_contacto,
      google_refresh_token: negocio?.google_refresh_token,
      google_access_token: negocio?.google_access_token,
      whatsapp_access_token: negocio?.whatsapp_access_token,
      config_web: negocio?.config_web,
    }

    // Notificar al cliente: turno cancelado
    await sendNotification({
      event: 'turno_cancelado',
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

    // ═══ 6. REVALIDAR Y RETORNAR ══════════════════════════════════════════════
    revalidatePath('/dashboard')

    return { success: true }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[CALENDAR] Error canceling appointment:', error)
    return { success: false, error: message }
  }
}