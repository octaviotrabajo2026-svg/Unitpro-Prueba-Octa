'use server'

import { compileEmailTemplate } from '@/lib/email-helper'
import { sendWhatsAppNotification } from '@/lib/whatsapp-helper'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { google } from 'googleapis'
import { revalidatePath } from 'next/cache'
import type { BookingPayload } from '@/types/booking'
import { createGoogleCalendarClient } from '@/app/actions/shared/google-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Obtiene el negocio_id del usuario autenticado en la sesión actual.
 * Retorna null si no hay sesión o el usuario no tiene negocio asociado.
 */
async function getAuthenticatedNegocioId(): Promise<number | null> {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return null;

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id')
    .eq('user_id', user.id)
    .single();

  return negocio?.id ?? null;
}

// --- CREATE ---
export async function createAppointment(slug: string, bookingData: BookingPayload) {
  try {
    // 1. Validaciones iniciales
    const { data: negocio } = await supabase.from('negocios').select('*').eq('slug', slug).single()
    const teamConfig = negocio.config_web?.equipo || {};
    const availabilityMode = teamConfig.availabilityMode || 'global';
    if (!negocio?.google_refresh_token) throw new Error('Negocio no conectado')

    // 2. Auth
    const { calendar, gmail: gmailClient, auth } = createGoogleCalendarClient(negocio.google_refresh_token)
    const description =`Servicio: ${bookingData.service}\n` +
                        `Profesional: ${bookingData.workerName || 'Cualquiera'}\n` + // <--- NUEVO
                        `Cliente: ${bookingData.clientName}\nTel: ${bookingData.clientPhone}`;
    const conflictCheck = await calendar.events.list({
        calendarId: 'primary',
        timeMin: bookingData.start, 
        timeMax: bookingData.end,
        singleEvents: true,
        timeZone: 'America/Argentina/Buenos_Aires' // O la timezone de tu config
    });

    const conflictingEvents = conflictCheck.data.items || [];
    const targetWorkerId = bookingData.workerId ? String(bookingData.workerId).trim() : null;
    const servicios = negocio.config_web?.servicios?.items || [];
    const servicioEncontrado = servicios.find((s: any) => s.titulo === bookingData.service);
    const precioDelServicio = servicioEncontrado?.precio || '';

    // 2. Revisamos uno por uno si generan conflicto real
    for (const existingEvent of conflictingEvents) {
        // Ignoramos si es transparente o cancelado
        if (existingEvent.transparency === 'transparent') continue;
        if (existingEvent.status === 'cancelled') continue;

        // Extraemos ID del profesional del evento existente
        const shared = (existingEvent.extendedProperties?.shared as any) || {};
        const eventWorkerId = shared['saas_worker_id'] ? String(shared['saas_worker_id']).trim() : null;

        let hayConflicto = false;

        if (availabilityMode === 'global') {
             // Si es Sala Única, CUALQUIER evento bloquea
             hayConflicto = true;
        } else {
             // Si es Simultáneo:
             // - Bloquea si es un evento "general" (sin profesional asignado, ej: feriado)
             // - Bloquea si es del MISMO profesional que estamos intentando reservar
             if (!eventWorkerId || (targetWorkerId && eventWorkerId === targetWorkerId)) {
                 hayConflicto = true;
             }
        }

        if (hayConflicto) {
            throw new Error('El horario seleccionado ya no está disponible (bloqueo por backend).');
        }
    }

    // 3. Crear Evento (Tu lógica original estaba bien, la mantenemos)
    // NOTA: Asumimos que bookingData.start ya viene en formato ISO correcto desde el frontend
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Turno: ${bookingData.clientName} (${bookingData.workerName || 'General'})`,
        description: description,
        start: { dateTime: bookingData.start, timeZone: 'America/Argentina/Buenos_Aires' },
        end: { dateTime: bookingData.end, timeZone: 'America/Argentina/Buenos_Aires' },
        attendees: bookingData.clientEmail ? [{ email: bookingData.clientEmail }] : [],
        extendedProperties: {
          shared: {
            saas_worker_id: bookingData.workerId || '',
            saas_service_type: 'service_booking'
          }
        },

        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 30 }, { method: 'email', minutes: 1440 }]
        }
      }
    })

    // 4. Guardar en Supabase
    const emailNormalizado = bookingData.clientEmail?.trim().toLowerCase();

    // A. Buscamos si este cliente ya tiene CUALQUIER registro (usamos ilike y limit 1)
    const { data: turnosExistentes } = await supabase
      .from('turnos')
      .select('id')
      .eq('negocio_id', negocio.id)
      .ilike('cliente_email', emailNormalizado) // ilike ignora mayúsculas/minúsculas
      .limit(1) // IMPORTANTE: Si hay duplicados, agarramos solo uno para evitar errores


    
    const turnoExistente = turnosExistentes && turnosExistentes.length > 0 ? turnosExistentes[0] : null;
    const servicioConProfesional = `${bookingData.service} - ${bookingData.workerName || 'Cualquiera'}`;
    if (turnoExistente) {
  // B. EXISTE: Sobreescribimos ese registro con los datos nuevos


  const { error } = await supabase
    .from('turnos')
    .update({
      cliente_nombre: bookingData.clientName,
      cliente_telefono: bookingData.clientPhone,
      servicio: servicioConProfesional,
      fecha_inicio: bookingData.start,
      fecha_fin: bookingData.end,
      google_event_id: event.data.id,
      estado: 'confirmado',
      recordatorio_enviado: false // <--- ¡AGREGA ESTA LÍNEA!
    })
    .eq('id', turnoExistente.id)
  
  if (error) throw error

} else {
  // C. NO EXISTE: Creamos el primer registro
  const { error } = await supabase.from('turnos').insert({
    negocio_id: negocio.id,
    cliente_nombre: bookingData.clientName,
    cliente_telefono: bookingData.clientPhone,
    cliente_email: bookingData.clientEmail,
    servicio: servicioConProfesional,
    fecha_inicio: bookingData.start,
    fecha_fin: bookingData.end,
    google_event_id: event.data.id,
    estado: 'confirmado',
    recordatorio_enviado: false // <--- Buena práctica: asegurarlo también aquí, aunque el default de la DB sea false.
  })

  if (error) throw error
}
    try {
        const fechaLegible = new Date(bookingData.start).toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });

        const emailData = compileEmailTemplate(
        'confirmation',
        negocio.config_web,
        {
            cliente: bookingData.clientName,
            servicio: servicioConProfesional,
            fecha: fechaLegible,
            profesional: bookingData.workerName,
            precio_total: precioDelServicio
        }
    );

    // >>> CORRECCIÓN: Verificamos si el mail está activado antes de armarlo <<<
    if (emailData) {
        const gmail = gmailClient;

        const utf8Subject = `=?utf-8?B?${Buffer.from(emailData.subject).toString('base64')}?=`;
        const messageParts = [
          `To: ${bookingData.clientEmail}`,
          'Content-Type: text/html; charset=utf-8',
          'MIME-Version: 1.0',
          `Subject: ${utf8Subject}`,
          '',
          emailData.html, // Ahora sí es seguro acceder a .html
        ];
        
        const rawMessage = Buffer.from(messageParts.join('\n'))
          .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

        await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: rawMessage },
        });
    }
    } catch (emailError) {
        console.error("No se pudo enviar el mail de confirmación:", emailError);
        // No lanzamos error para no fallar la reserva si solo falló el mail
    }
    revalidatePath('/dashboard') // O la ruta que corresponda
    return { success: true, eventLink: event.data.htmlLink }

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error creating appointment:', error)
    return { success: false, error: msg }
  }
}

// --- CANCEL ---
export async function cancelAppointment(appointmentId: string) {
  try {
    // Verificar autenticación y obtener el negocio del usuario autenticado
    const negocioId = await getAuthenticatedNegocioId();
    if (negocioId === null) return { success: false, error: 'No autorizado.' };

    // 1. Obtener datos del turno y refresh token del negocio asociado
    const { data: turno, error: turnoError } = await supabase
      .from('turnos')
      .select('*, negocios(google_refresh_token, whatsapp_access_token, config_web)')
      .eq('id', appointmentId)
      .single()

    if (turnoError || !turno) throw new Error('Turno no encontrado')

    // Verificar que el turno pertenezca al negocio del usuario autenticado
    if (turno.negocio_id !== negocioId) return { success: false, error: 'No autorizado.' };

    const negocio = turno.negocios as any
    const refreshToken = negocio?.google_refresh_token

    if (!refreshToken) throw new Error('No se pudo conectar con Google Calendar del negocio')

    // 2. Auth con Google
    const { calendar, gmail } = createGoogleCalendarClient(refreshToken)

    // 3. Eliminar de Google Calendar (si tiene ID de evento)
    if (turno.google_event_id) {
      try {
        await calendar.events.delete({ calendarId: 'primary', eventId: turno.google_event_id })
      } catch (gError) { console.warn('Evento ya borrado en Google', gError) }
    }

    // 4. Actualizar estado en Supabase
    const { error: deleteError } = await supabase
      .from('turnos')
      .update({ estado: 'cancelado' })
      .eq('id', appointmentId)

    if (deleteError) throw deleteError

    // 5. Notificaciones de cancelación
    const fechaLegible = new Date(turno.fecha_inicio).toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    })
    const variablesNotificacion = {
      cliente: turno.cliente_nombre,
      servicio: turno.servicio,
      fecha: fechaLegible
    }

    if (negocio?.whatsapp_access_token && turno.cliente_telefono) {
      try {
        await sendWhatsAppNotification(turno.cliente_telefono, 'cancellation', variablesNotificacion, negocio.whatsapp_access_token)
      } catch (e) { console.error('Error WhatsApp cancelación:', e) }
    }

    if (turno.cliente_email && negocio?.config_web) {
      try {
        const emailData = compileEmailTemplate('cancellation', negocio.config_web, variablesNotificacion)
        if (emailData) {
          const utf8Subject = `=?utf-8?B?${Buffer.from(emailData.subject).toString('base64')}?=`
          const raw = Buffer.from([
            `To: ${turno.cliente_email}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${utf8Subject}`,
            '',
            emailData.html,
          ].join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
          await gmail.users.messages.send({ userId: 'me', requestBody: { raw } })
        }
      } catch (e) { console.error('Error email cancelación:', e) }
    }

    // 6. Revalidar UI
    revalidatePath('/dashboard')

    return { success: true }

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error canceling appointment:', error)
    return { success: false, error: msg }
  }
}
export async function createManualAppointment(slug: string, bookingData: any) {
  try {
    // 1. Obtener negocio y auth
    const { data: negocio } = await supabase.from('negocios').select('*').eq('slug', slug).single()
    if (!negocio?.google_refresh_token) throw new Error('Negocio no conectado')

    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    // 2. Crear evento en Google Calendar primero para tener el ID
    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: `Turno Manual: ${bookingData.clientName}`,
        description: `Servicio: ${bookingData.service}\nTel: ${bookingData.clientPhone}\nAgendado manualmente desde el dashboard.`,
        start: { dateTime: bookingData.start, timeZone: 'America/Argentina/Buenos_Aires' },
        end: { dateTime: bookingData.end, timeZone: 'America/Argentina/Buenos_Aires' },
        extendedProperties: {
          shared: {
            saas_worker_id: bookingData.workerId,
            saas_service_type: 'confirm_booking_manual'
          }
        }
      }
    })

    // 3. Guardar en Supabase directamente como 'confirmado'
    const { error } = await supabase.from('turnos').insert({
      negocio_id: negocio.id,
      cliente_nombre: bookingData.clientName,
      cliente_telefono: bookingData.clientPhone,
      cliente_email: bookingData.clientEmail,
      servicio: `${bookingData.service} - ${bookingData.workerName}`,
      fecha_inicio: bookingData.start,
      fecha_fin: bookingData.end,
      estado: 'confirmado',
      google_event_id: event.data.id
    })

    if (error) throw error

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error manual booking:', error)
    return { success: false, error: msg }
  }
}