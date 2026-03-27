// blocks/calendar/actions/mark-paid.ts
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

export interface MarkPaidResult {
  success: boolean;
  error?: string;
}

/**
 * Marca una seña como pagada y confirma definitivamente el turno.
 * Crea el evento en Google Calendar.
 */
export async function markDepositPaid(turnoId: string): Promise<MarkPaidResult> {
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
      .eq('id', turnoId)
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

    const configWeb = negocio.config_web || {}

    // ═══ 3. AUTH CON GOOGLE ═══════════════════════════════════════════════════
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    // ═══ 4. VERIFICAR DISPONIBILIDAD ══════════════════════════════════════════
    // El horario no estaba bloqueado mientras esperaba seña, hay que verificar
    const conflictCheck = await calendar.events.list({
      calendarId: 'primary',
      timeMin: turno.fecha_inicio,
      timeMax: turno.fecha_fin,
      singleEvents: true,
      timeZone: 'America/Argentina/Buenos_Aires',
    })

    if (conflictCheck.data.items) {
      const availabilityMode = configWeb.equipo?.availabilityMode || 'global'
      
      // Extraer profesional
      const parts = turno.servicio?.split(' - ') || []
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

      for (const event of conflictCheck.data.items) {
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
          success: false, 
          error: '⚠️ El horario se llenó mientras esperábamos el pago. Por favor, contacta al cliente para reprogramar.' 
        }
      }
    }

    // ═══ 5. CREAR EVENTO EN GOOGLE CALENDAR ═══════════════════════════════════
    // Extraer profesional
    const parts = turno.servicio?.split(' - ') || []
    const workerName = parts.length > 1 ? parts[parts.length - 1] : null
    const trabajador = configWeb.equipo?.items?.find((w: any) => w.nombre === workerName)
    const workerId = trabajador ? String(trabajador.id) : null

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Turno: ${turno.cliente_nombre}`,
        description: `Servicio: ${turno.servicio}\nTel: ${turno.cliente_telefono}\nSEÑA ABONADA - CONFIRMADO`,
        start: { 
          dateTime: turno.fecha_inicio, 
          timeZone: 'America/Argentina/Buenos_Aires' 
        },
        end: { 
          dateTime: turno.fecha_fin, 
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

    // ═══ 6. ACTUALIZAR EN SUPABASE ════════════════════════════════════════════
    const { error: updateError } = await supabase
      .from('turnos')
      .update({
        estado: 'confirmado',
        google_event_id: event.data.id,
      })
      .eq('id', turnoId)

    if (updateError) throw updateError

    // ═══ 7. ENVIAR NOTIFICACIONES ═════════════════════════════════════════════
    const { fecha, hora } = formatFechaArgentina(turno.fecha_inicio)

    // Calcular montos
    const bookingConfig = configWeb.booking || {}
    const precioTotal = turno.precio_total || 0
    const porcentajeSenia = bookingConfig.depositPercentage || 50
    const montoPagado = (precioTotal * porcentajeSenia) / 100
    const saldoRestante = precioTotal - montoPagado

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

    // Notificar al cliente: turno confirmado
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
        precio_total: `$${precioTotal}`,
        monto_senia: `$${montoPagado}`,
        precio_a_pagar: saldoRestante > 0 ? `$${saldoRestante}` : '',
      },
    })

    // ═══ 8. REVALIDAR Y RETORNAR ══════════════════════════════════════════════
    revalidatePath('/dashboard')

    return { success: true }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[CALENDAR] Error marking paid:', error)
    return { success: false, error: message }
  }
}