// blocks/calendar/actions/create-appointment.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { revalidatePath } from 'next/cache'
import { 
  sendNotification, 
  notifyOwnerNewAppointment,
  formatFechaArgentina,
  type NegocioNotificationData,
} from '@/lib/notifications'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface CreateAppointmentPayload {
  // Datos del cliente
  clientName: string;
  clientLastName?: string;
  clientPhone: string;
  clientEmail?: string;
  
  // Datos del turno
  service: string;
  start: string;  // ISO datetime
  end: string;    // ISO datetime
  
  // Profesional (opcional)
  workerId?: string;
  workerName?: string;
  
  // Extras (para confirm-booking)
  message?: string;
  images?: string[];
}

export interface CreateAppointmentResult {
  success: boolean;
  error?: string;
  eventLink?: string;
  pending?: boolean;  // true si quedó en estado pendiente
  turnoId?: string;
}

// ─── Acción Principal ────────────────────────────────────────────────────────

/**
 * Crea un nuevo turno.
 * 
 * Flujo inteligente según configuración del negocio:
 * - Si `requireManualConfirmation` = false → Confirma automáticamente
 * - Si `requireManualConfirmation` = true → Queda pendiente de aprobación
 * - Si además `requestDeposit` = true → Luego de aprobar, pide seña
 */
export async function createAppointment(
  slug: string, 
  bookingData: CreateAppointmentPayload
): Promise<CreateAppointmentResult> {
  try {
    // ═══ 1. OBTENER NEGOCIO ═══════════════════════════════════════════════════
    const { data: negocio, error: negocioError } = await supabase
      .from('negocios')
      .select('*')
      .eq('slug', slug)
      .single()

    if (negocioError || !negocio) {
      return { success: false, error: 'Negocio no encontrado' }
    }

    // ═══ 2. LEER CONFIGURACIÓN ════════════════════════════════════════════════
    const configWeb = negocio.config_web || {}
    const bookingConfig = configWeb.booking || {}
    const teamConfig = configWeb.equipo || {}
    
    const requireManualConfirmation = bookingConfig.requireManualConfirmation ?? true
    const requestDeposit = bookingConfig.requestDeposit ?? false
    const depositPercentage = bookingConfig.depositPercentage ?? 50
    const availabilityMode = teamConfig.availabilityMode || 'global'

    // ═══ 3. PREPARAR DATOS DEL TURNO ══════════════════════════════════════════
    const clienteNombreCompleto = bookingData.clientLastName 
      ? `${bookingData.clientName} ${bookingData.clientLastName}`.trim()
      : bookingData.clientName

    const servicioConProfesional = bookingData.workerName 
      ? `${bookingData.service} - ${bookingData.workerName}`
      : bookingData.service

    const emailNormalizado = bookingData.clientEmail?.trim().toLowerCase() || null

    // Buscar precio del servicio
    const allServices = [
      ...(configWeb.servicios?.items || []),
      ...(configWeb.services || []),
    ]
    const serviceFound = allServices.find((s: any) => 
      s.titulo === bookingData.service || s.name === bookingData.service
    )
    const rawPrice = serviceFound?.precio || serviceFound?.price || 0
    const precioServicio = typeof rawPrice === 'string' 
      ? Number(rawPrice.replace(/[^0-9.-]+/g, '')) 
      : Number(rawPrice)

    // ═══ 4. DETERMINAR ESTADO INICIAL ═════════════════════════════════════════
    // Si NO requiere confirmación manual → auto-confirmar
    const autoConfirmar = !requireManualConfirmation
    let estadoInicial: 'pendiente' | 'confirmado' = autoConfirmar ? 'confirmado' : 'pendiente'
    let googleEventId: string | null = null

    // ═══ 5. SI AUTO-CONFIRMA → VALIDAR Y CREAR EN GOOGLE CALENDAR ═════════════
    if (autoConfirmar && negocio.google_refresh_token) {
      const calendarResult = await createGoogleCalendarEvent(
        negocio,
        bookingData,
        clienteNombreCompleto,
        servicioConProfesional,
        availabilityMode
      )

      if (!calendarResult.success) {
        return { success: false, error: calendarResult.error }
      }

      googleEventId = calendarResult.eventId || null
    }

    // ═══ 6. GUARDAR EN SUPABASE ═══════════════════════════════════════════════
    // Buscar si el cliente ya existe (por email)
    let turnoId: string | null = null

    if (emailNormalizado) {
      const { data: turnosExistentes } = await supabase
        .from('turnos')
        .select('id')
        .eq('negocio_id', negocio.id)
        .ilike('cliente_email', emailNormalizado)
        .limit(1)

      if (turnosExistentes && turnosExistentes.length > 0) {
        // Actualizar turno existente
        const { error: updateError } = await supabase
          .from('turnos')
          .update({
            cliente_nombre: clienteNombreCompleto,
            cliente_telefono: bookingData.clientPhone,
            servicio: servicioConProfesional,
            fecha_inicio: bookingData.start,
            fecha_fin: bookingData.end,
            mensaje: bookingData.message || null,
            fotos: bookingData.images || null,
            estado: estadoInicial,
            google_event_id: googleEventId,
            precio_total: precioServicio,
            recordatorio_enviado: false,
          })
          .eq('id', turnosExistentes[0].id)

        if (updateError) throw updateError
        turnoId = turnosExistentes[0].id
      }
    }

    if (!turnoId) {
      // Crear nuevo turno
      const { data: nuevoTurno, error: insertError } = await supabase
        .from('turnos')
        .insert({
          negocio_id: negocio.id,
          cliente_nombre: clienteNombreCompleto,
          cliente_telefono: bookingData.clientPhone,
          cliente_email: emailNormalizado,
          servicio: servicioConProfesional,
          fecha_inicio: bookingData.start,
          fecha_fin: bookingData.end,
          mensaje: bookingData.message || null,
          fotos: bookingData.images || null,
          estado: estadoInicial,
          google_event_id: googleEventId,
          precio_total: precioServicio,
          recordatorio_enviado: false,
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      turnoId = nuevoTurno.id
    }

    // ═══ 7. ENVIAR NOTIFICACIONES ═════════════════════════════════════════════
    const { fecha, hora } = formatFechaArgentina(bookingData.start)
    const negocioNotif: NegocioNotificationData = {
      id: negocio.id,
      nombre: negocio.nombre,
      slug: negocio.slug,
      email: negocio.email_contacto || negocio.usuario_email,
      telefono: negocio.telefono_contacto,
      google_refresh_token: negocio.google_refresh_token,
      google_access_token: negocio.google_access_token,
      whatsapp_access_token: negocio.whatsapp_access_token,
      config_web: configWeb,
    }

    if (autoConfirmar) {
      // Notificar al cliente: turno confirmado
      await sendNotification({
        event: 'turno_creado_cliente',
        recipient: {
          type: 'cliente',
          nombre: clienteNombreCompleto,
          email: emailNormalizado || undefined,
          telefono: bookingData.clientPhone,
        },
        negocio: negocioNotif,
        variables: {
          cliente: clienteNombreCompleto,
          servicio: servicioConProfesional,
          fecha,
          hora,
          profesional: bookingData.workerName || '',
        },
      })

      // Notificar al dueño/profesional: nuevo turno
      await notifyOwnerNewAppointment(negocioNotif, {
        clienteNombre: clienteNombreCompleto,
        clienteTelefono: bookingData.clientPhone,
        servicio: servicioConProfesional,
        fecha,
        hora,
        profesionalId: bookingData.workerId,
        profesionalNombre: bookingData.workerName,
      })
    } else {
      // Turno pendiente → Solo notificar al dueño/profesional
      await notifyOwnerNewAppointment(negocioNotif, {
        clienteNombre: clienteNombreCompleto,
        clienteTelefono: bookingData.clientPhone,
        servicio: servicioConProfesional,
        fecha,
        hora,
        profesionalId: bookingData.workerId,
        profesionalNombre: bookingData.workerName,
      })
    }

    // ═══ 8. REVALIDAR Y RETORNAR ══════════════════════════════════════════════
    revalidatePath('/dashboard')
    
    return { 
      success: true, 
      pending: !autoConfirmar,
      turnoId: turnoId || undefined,
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[CALENDAR] Error creating appointment:', error)
    return { success: false, error: message }
  }
}

// ─── Helper: Crear Evento en Google Calendar ─────────────────────────────────

async function createGoogleCalendarEvent(
  negocio: any,
  bookingData: CreateAppointmentPayload,
  clienteNombre: string,
  servicioConProfesional: string,
  availabilityMode: string
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    if (!negocio.google_refresh_token) {
      return { success: false, error: 'Google Calendar no está conectado' }
    }

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    // Validar disponibilidad antes de crear
    const conflictCheck = await calendar.events.list({
      calendarId: 'primary',
      timeMin: bookingData.start,
      timeMax: bookingData.end,
      singleEvents: true,
      timeZone: 'America/Argentina/Buenos_Aires',
    })

    const conflictingEvents = conflictCheck.data.items || []
    const targetWorkerId = bookingData.workerId?.trim() || null

    for (const existingEvent of conflictingEvents) {
      if (existingEvent.transparency === 'transparent') continue
      if (existingEvent.status === 'cancelled') continue

      const shared = (existingEvent.extendedProperties?.shared as any) || {}
      const eventWorkerId = shared['saas_worker_id']?.trim() || null

      let hayConflicto = false

      if (availabilityMode === 'global' || availabilityMode === 'sala_unica') {
        hayConflicto = true
      } else {
        // Modo por profesional
        if (!eventWorkerId || (targetWorkerId && eventWorkerId === targetWorkerId)) {
          hayConflicto = true
        }
      }

      if (hayConflicto) {
        return { 
          success: false, 
          error: 'El horario seleccionado ya no está disponible' 
        }
      }
    }

    // Crear evento
    const description = [
      `Servicio: ${bookingData.service}`,
      bookingData.workerName ? `Profesional: ${bookingData.workerName}` : '',
      `Cliente: ${clienteNombre}`,
      `Tel: ${bookingData.clientPhone}`,
    ].filter(Boolean).join('\n')

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Turno: ${clienteNombre} (${bookingData.workerName || 'General'})`,
        description,
        start: { 
          dateTime: bookingData.start, 
          timeZone: 'America/Argentina/Buenos_Aires' 
        },
        end: { 
          dateTime: bookingData.end, 
          timeZone: 'America/Argentina/Buenos_Aires' 
        },
        attendees: bookingData.clientEmail 
          ? [{ email: bookingData.clientEmail }] 
          : [],
        extendedProperties: {
          shared: {
            saas_worker_id: bookingData.workerId || '',
            saas_service_type: 'calendar_block',
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

    return { success: true, eventId: event.data.id || undefined }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[CALENDAR] Error creating Google event:', error)
    return { success: false, error: message }
  }
}

// ─── Crear Turno Manual (desde el dashboard) ─────────────────────────────────

/**
 * Crea un turno manualmente desde el dashboard del dueño.
 * Siempre se crea como confirmado (no pasa por flujo de aprobación).
 */
export async function createManualAppointment(
  slug: string,
  bookingData: CreateAppointmentPayload
): Promise<CreateAppointmentResult> {
  try {
    const { data: negocio } = await supabase
      .from('negocios')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!negocio?.google_refresh_token) {
      return { success: false, error: 'Google Calendar no está conectado' }
    }

    const configWeb = negocio.config_web || {}
    const teamConfig = configWeb.equipo || {}
    const availabilityMode = teamConfig.availabilityMode || 'global'

    const clienteNombreCompleto = bookingData.clientLastName
      ? `${bookingData.clientName} ${bookingData.clientLastName}`.trim()
      : bookingData.clientName

    const servicioConProfesional = bookingData.workerName
      ? `${bookingData.service} - ${bookingData.workerName}`
      : bookingData.service

    // Crear evento en Google Calendar
    const calendarResult = await createGoogleCalendarEvent(
      negocio,
      bookingData,
      clienteNombreCompleto,
      servicioConProfesional,
      availabilityMode
    )

    if (!calendarResult.success) {
      return { success: false, error: calendarResult.error }
    }

    // Guardar en Supabase
    const { error: insertError } = await supabase.from('turnos').insert({
      negocio_id: negocio.id,
      cliente_nombre: clienteNombreCompleto,
      cliente_telefono: bookingData.clientPhone,
      cliente_email: bookingData.clientEmail?.trim().toLowerCase() || null,
      servicio: servicioConProfesional,
      fecha_inicio: bookingData.start,
      fecha_fin: bookingData.end,
      estado: 'confirmado',
      google_event_id: calendarResult.eventId,
      recordatorio_enviado: false,
    })

    if (insertError) throw insertError

    revalidatePath('/dashboard')
    return { success: true }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[CALENDAR] Error manual booking:', error)
    return { success: false, error: message }
  }
}