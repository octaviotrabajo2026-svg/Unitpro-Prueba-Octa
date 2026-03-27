// blocks/calendar/actions/approve-appointment.ts
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

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ApproveAppointmentResult {
  success: boolean;
  error?: string;
  needsDeposit?: boolean;  // true si pasa a estado 'esperando_senia'
}

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

/**
 * Aprueba un turno pendiente.
 * 
 * @param appointmentId - ID del turno
 * @param finalPrice - Precio final (puede diferir del original)
 * @param finalDuration - Duración final en minutos (opcional, para ajustar hora fin)
 */
export async function approveAppointment(
  appointmentId: string,
  finalPrice?: number,
  finalDuration?: number
): Promise<ApproveAppointmentResult> {
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

    const negocio = turno.negocios
    if (!negocio?.google_refresh_token) {
      return { success: false, error: 'Google Calendar no está conectado' }
    }

    // ═══ 3. CALCULAR FECHA FIN SI HAY DURACIÓN NUEVA ══════════════════════════
    let finalEndDate = turno.fecha_fin
    if (finalDuration) {
      const start = new Date(turno.fecha_inicio)
      finalEndDate = new Date(start.getTime() + finalDuration * 60000).toISOString()
    }

    // ═══ 4. LEER CONFIGURACIÓN ════════════════════════════════════════════════
    const configWeb = negocio.config_web || {}
    const bookingConfig = configWeb.booking || {}
    const teamConfig = configWeb.equipo || {}
    
    const requestDeposit = bookingConfig.requestDeposit ?? false
    const depositPercentage = bookingConfig.depositPercentage ?? 50
    const availabilityMode = teamConfig.availabilityMode || 'global'

    // ═══ 5. VERIFICAR DISPONIBILIDAD EN GOOGLE CALENDAR ═══════════════════════
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    const conflictCheck = await calendar.events.list({
      calendarId: 'primary',
      timeMin: turno.fecha_inicio,
      timeMax: finalEndDate,
      singleEvents: true,
      timeZone: 'America/Argentina/Buenos_Aires',
    })

    // Verificar conflictos
    if (conflictCheck.data.items) {
      const { hasConflict, error } = checkConflicts(
        conflictCheck.data.items,
        turno.servicio,
        configWeb,
        availabilityMode
      )

      if (hasConflict) {
        return { success: false, error: error || 'El horario ya no está disponible' }
      }
    }

    // ═══ 6. DETERMINAR NUEVO ESTADO ═══════════════════════════════════════════
    const precio = finalPrice ?? turno.precio_total ?? 0
    const necesitaSenia = requestDeposit && depositPercentage > 0 && precio > 0
    const nuevoEstado = necesitaSenia ? 'esperando_senia' : 'confirmado'

    // ═══ 7. SI NO NECESITA SEÑA → CREAR EVENTO EN CALENDAR ════════════════════
    let googleEventId: string | null = null

    if (!necesitaSenia) {
      const eventResult = await createCalendarEvent(
        calendar,
        turno,
        finalEndDate,
        configWeb
      )

      if (!eventResult.success) {
        return { success: false, error: eventResult.error }
      }

      googleEventId = eventResult.eventId || null
    }

    // ═══ 8. ACTUALIZAR EN SUPABASE ════════════════════════════════════════════
    const { error: updateError } = await supabase
      .from('turnos')
      .update({
        estado: nuevoEstado,
        google_event_id: googleEventId,
        precio_total: precio,
        fecha_fin: finalEndDate,
      })
      .eq('id', appointmentId)

    if (updateError) throw updateError

    // ═══ 9. ENVIAR NOTIFICACIONES ═════════════════════════════════════════════
    const { fecha, hora } = formatFechaArgentina(turno.fecha_inicio)
    const depositAmount = necesitaSenia ? (precio * depositPercentage) / 100 : 0

    // Buscar datos del profesional
    const serviceString = turno.servicio || ''
    const parts = serviceString.split(' - ')
    const workerName = parts.length > 1 ? parts[parts.length - 1] : null
    const trabajador = configWeb.equipo?.items?.find((w: any) => w.nombre === workerName)

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

    if (necesitaSenia) {
      // Notificar: seña requerida
      await sendNotification({
        event: 'seña_requerida',
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
          profesional: workerName || '',
          precio_total: `$${precio}`,
          monto_senia: `$${depositAmount}`,
          alias: trabajador?.aliasCvu || '',
        },
      })
    } else {
      // Notificar: turno confirmado
      await sendNotification({
        event: 'turno_confirmado',
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
          profesional: workerName || '',
        },
      })
    }

    // ═══ 10. REVALIDAR Y RETORNAR ═════════════════════════════════════════════
    revalidatePath('/dashboard')

    return { 
      success: true, 
      needsDeposit: necesitaSenia 
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[CALENDAR] Error approving appointment:', error)
    return { success: false, error: message }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function checkConflicts(
  events: any[],
  servicio: string,
  configWeb: any,
  availabilityMode: string
): { hasConflict: boolean; error?: string } {
  // Extraer profesional del servicio
  const parts = servicio?.split(' - ') || []
  const workerName = parts.length > 1 ? parts[parts.length - 1] : null
  const targetWorker = configWeb.equipo?.items?.find((w: any) => w.nombre === workerName)
  const targetWorkerId = targetWorker ? String(targetWorker.id) : null

  // Determinar capacidad
  let capacity = 1
  const isGlobal = availabilityMode === 'global' || availabilityMode === 'sala_unica'
  const permiteSimultaneo = targetWorker?.allowSimultaneous === true || 
                           String(targetWorker?.allowSimultaneous) === 'true'

  if (!isGlobal && permiteSimultaneo) {
    capacity = Number(targetWorker?.simultaneousCapacity) || 2
  }

  let overlappingCount = 0

  for (const event of events) {
    if (event.transparency === 'transparent' || event.status === 'cancelled') continue

    const shared = (event.extendedProperties?.shared as any) || {}
    const eventWorkerId = shared['saas_worker_id']?.trim() || null

    if (availabilityMode === 'global') {
      overlappingCount += 1
    } else {
      if (!eventWorkerId || (targetWorkerId && eventWorkerId === targetWorkerId)) {
        overlappingCount += 1
      }
    }
  }

  if (overlappingCount >= capacity) {
    return { 
      hasConflict: true, 
      error: '⚠️ El horario ya está ocupado. La duración ingresada pisa otro turno existente.' 
    }
  }

  return { hasConflict: false }
}

async function createCalendarEvent(
  calendar: any,
  turno: any,
  endDate: string,
  configWeb: any
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    // Extraer profesional
    const parts = turno.servicio?.split(' - ') || []
    const workerName = parts.length > 1 ? parts[parts.length - 1] : null
    const trabajador = configWeb.equipo?.items?.find((w: any) => w.nombre === workerName)
    const workerId = trabajador ? String(trabajador.id) : null

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Turno: ${turno.cliente_nombre}`,
        description: `Servicio: ${turno.servicio}\nTel: ${turno.cliente_telefono}\nCONFIRMADO`,
        start: { 
          dateTime: turno.fecha_inicio, 
          timeZone: 'America/Argentina/Buenos_Aires' 
        },
        end: { 
          dateTime: endDate, 
          timeZone: 'America/Argentina/Buenos_Aires' 
        },
        attendees: turno.cliente_email ? [{ email: turno.cliente_email }] : [],
        extendedProperties: {
          shared: {
            saas_service_type: 'calendar_block',
            ...(workerId ? { saas_worker_id: workerId } : {}),
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 30 },
            { method: 'email', minutes: 1440 },
          ],
        },
      },
    })

    return { success: true, eventId: event.data.id }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[CALENDAR] Error creating calendar event:', error)
    return { success: false, error: message }
  }
}