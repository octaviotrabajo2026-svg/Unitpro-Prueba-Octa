'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { google } from 'googleapis'
import { revalidatePath } from 'next/cache'
import { compileEmailTemplate } from '@/lib/email-helper'
import { sendWhatsAppNotification } from '@/lib/whatsapp-helper'
import type { BookingPayload } from '@/types/booking'


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Verifica que el usuario autenticado sea propietario del turno dado.
 * Retorna el user_id autenticado si tiene acceso, null si no.
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
export async function createAppointment(slug: string, bookingData: BookingPayload & { message?: string; images?: string[] }) {
  try {
    // 1. Validaciones iniciales
    const { data: negocio } = await supabase.from('negocios').select('*').eq('slug', slug).single()
    if (!negocio) throw new Error('Negocio no encontrado')

    // 2. Preparar los datos (Mantenemos tu lógica de servicio + profesional)
    const servicioConProfesional = `${bookingData.service} - ${bookingData.workerName || 'Cualquiera'}`;
    const emailNormalizado = bookingData.clientEmail?.trim().toLowerCase();

    const turnoData = {
        negocio_id: negocio.id,
        cliente_nombre: bookingData.clientName,
        cliente_telefono: bookingData.clientPhone,
        cliente_email: bookingData.clientEmail,
        servicio: servicioConProfesional,
        fecha_inicio: bookingData.start,
        fecha_fin: bookingData.end,
        mensaje: bookingData.message,
        fotos: bookingData.images,
        estado: 'pendiente', // <--- CAMBIO: Ahora nace como pendiente
        google_event_id: null, // <--- No tiene evento aún
        recordatorio_enviado: false
    };

    // 3. Guardar en Supabase (Tu lógica A, B y C intacta)
    const { data: turnosExistentes } = await supabase
      .from('turnos')
      .select('id')
      .eq('negocio_id', negocio.id)
      .ilike('cliente_email', emailNormalizado)
      .limit(1)
    
    const turnoExistente = turnosExistentes && turnosExistentes.length > 0 ? turnosExistentes[0] : null;

    let turnoGuardadoId = null;

    if (turnoExistente) {
      const { error } = await supabase.from('turnos').update(turnoData).eq('id', turnoExistente.id)
      if (error) throw error
      turnoGuardadoId = turnoExistente.id;
    } else {
      const { data: nuevoTurno, error } = await supabase.from('turnos').insert(turnoData).select('id').single()
      if (error) throw error
      turnoGuardadoId = nuevoTurno.id;
    }

    // --- NUEVO: LÓGICA DE AUTO-CONFIRMACIÓN DESDE EL BACKEND ---
    const configWeb = negocio.config_web || {};
    const requireManual = configWeb.booking?.requireManualConfirmation ?? true;

    if (!requireManual && turnoGuardadoId) {
        
        // 1. Buscamos el servicio en la configuración del negocio
        const allServices = [
            ...(configWeb.servicios?.items || []), 
            ...(configWeb.services || [])
        ];
        
        // Comparamos el nombre que llegó con los títulos de los servicios guardados
        const serviceFound = allServices.find((s: any) => 
            (s.titulo === bookingData.service || s.name === bookingData.service)
        );

        // 2. Extraemos el precio y lo convertimos a número limpio
        const rawPrice = serviceFound?.precio || serviceFound?.price || 0;
        const finalPrice = typeof rawPrice === 'string' ? Number(rawPrice.replace(/[^0-9.-]+/g,"")) : Number(rawPrice);

        // 3. Ejecutamos la aprobación automática internamente
        const approvalRes = await approveAppointment(turnoGuardadoId, finalPrice);
        
        if (!approvalRes.success) {
            console.error("Error en auto-confirmación:", approvalRes.error);
        }
        
        revalidatePath('/dashboard')
        return { success: true, pending: false } // Avisamos al frontend que NO quedó pendiente
    }
    
    // notificacion profesional

    try {
        const configWeb = negocio.config_web;
        const profesionales = configWeb?.equipo?.items || [];
        
        // Buscamos los datos del profesional usando el workerId de la reserva
        const trabajador = profesionales.find((p: any) => String(p.id) === String(bookingData.workerId));
        
        // Destinatario: prioridad al mail del profesional, fallback al mail del negocio
        const emailDestino = trabajador?.email || negocio.email_contacto || negocio.usuario_email;

        if (emailDestino && negocio.google_refresh_token) {
            
            // --- AGREGAMOS LA AUTENTICACIÓN AQUÍ PARA EVITAR EL ERROR ---
            const auth = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID, 
                process.env.GOOGLE_CLIENT_SECRET
            );
            auth.setCredentials({ refresh_token: negocio.google_refresh_token });
            // -----------------------------------------------------------

            const gmail = google.gmail({ version: 'v1', auth });
            
            // Formateamos la fecha para que se lea bien en Argentina
            const textoFecha = new Date(bookingData.start).toLocaleString('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires',
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });

            const subject = `Nueva Reserva: ${bookingData.service} - ${bookingData.clientName}`;
            const htmlBody = `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #2563eb;">Nueva Cita en Agenda</h2>
                    <p>Hola <strong>${trabajador?.nombre || 'Equipo'}</strong>,</p>
                    <p>Tienes un nuevo turno:</p>
                    <ul style="list-style: none; padding: 0;">
                        <li><strong>Servicio:</strong> ${bookingData.service}</li>
                        <li><strong>Fecha:</strong> ${textoFecha}</li>
                        <li><strong>Cliente:</strong> ${bookingData.clientName}</li>
                        <li><strong>Teléfono:</strong> ${bookingData.clientPhone}</li>
                    </ul>
                </div>
            `;

            const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
            const messageParts = [
                `To: ${emailDestino}`,
                'Content-Type: text/html; charset=utf-8',
                'MIME-Version: 1.0',
                `Subject: ${utf8Subject}`,
                '',
                htmlBody,
            ];

            const raw = Buffer.from(messageParts.join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            
            await gmail.users.messages.send({
                userId: 'me',
                requestBody: { raw },
            });
        }
    } catch (errorNotificacion) {
        console.error("No se pudo notificar al profesional/negocio:", errorNotificacion);
    }

    revalidatePath('/dashboard')
    return { success: true, pending: true } // Avisamos al frontend que SÍ quedó pendiente

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error creating request:', error)
    return { success: false, error: msg }
  }
}

export async function approveAppointment(appointmentId: string, finalPrice?: number, finalDuration?: number) {
  try {
    // Verificar autenticación y obtener el negocio del usuario autenticado
    const negocioId = await getAuthenticatedNegocioId();
    if (negocioId === null) return { success: false, error: 'No autorizado.' };

    // 1. Obtener datos
    const { data: turno, error: tErr } = await supabase
      .from('turnos')
      .select('*, negocios(*)')
      .eq('id', appointmentId)
      .single()

    if (tErr || !turno) throw new Error('Turno no encontrado')

    // Verificar que el turno pertenezca al negocio del usuario autenticado
    if (turno.negocio_id !== negocioId) return { success: false, error: 'No autorizado.' };
    const negocio = turno.negocios

    let finalEndDate = turno.fecha_fin;
    if (finalDuration) {
        const start = new Date(turno.fecha_inicio);
        finalEndDate = new Date(start.getTime() + finalDuration * 60000).toISOString();
    }
    
    // 2. Auth y Validación de Google Calendar
    if (!negocio?.google_refresh_token) {
        throw new Error('El negocio no tiene conectado Google Calendar')
    }

    const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID, 
        process.env.GOOGLE_CLIENT_SECRET
    );
    auth.setCredentials({ refresh_token: negocio.google_refresh_token });
    const calendar = google.calendar({ version: 'v3', auth });

    // 3. Determinar flujo
    const configWeb = negocio.config_web || {};
    const conflictCheck = await calendar.events.list({
        calendarId: 'primary',
        timeMin: turno.fecha_inicio, 
        timeMax: finalEndDate, 
        singleEvents: true,
        timeZone: 'America/Argentina/Buenos_Aires'
    });

    if (conflictCheck.data.items) {
        const availabilityMode = configWeb.equipo?.availabilityMode || 'global';
        
        // Identificar al profesional
        const serviceString = turno.servicio || "";
        const parts = serviceString.split(" - ");
        const workerName = parts.length > 1 ? parts[parts.length - 1] : null;
        const targetWorker = configWeb.equipo?.items?.find((w: any) => w.nombre === workerName);
        const targetWorkerId = targetWorker ? String(targetWorker.id) : null;

        let capacity = 1;
        const isGlobal = availabilityMode === 'global' || availabilityMode === 'sala_unica';
        const permiteSimultaneo = targetWorker?.allowSimultaneous === true || String(targetWorker?.allowSimultaneous) === 'true';

        if (!isGlobal && permiteSimultaneo) {
            capacity = Number(targetWorker?.simultaneousCapacity) || 2;
        }

        let overlappingCount = 0;
        const events = conflictCheck.data.items || [];
        
        for (const existingEvent of events) {
            if (existingEvent.transparency === 'transparent' || existingEvent.status === 'cancelled') continue;

            const shared = (existingEvent.extendedProperties?.shared as any) || {};
            const eventWorkerId = shared['saas_worker_id'] ? String(shared['saas_worker_id']).trim() : null;

            if (availabilityMode === 'global') {
                overlappingCount += 1; 
            } else {
                if (!eventWorkerId || (targetWorkerId && eventWorkerId === targetWorkerId)) {
                    overlappingCount += 1; 
                }
            }
        }

        // Si choca con otro turno, lanzamos el error ANTES de avanzar
        if (overlappingCount >= capacity) {
            throw new Error('⚠️ No puedes confirmar: La duración ingresada pisa otro turno existente o el horario ya fue ocupado en Calendar.');
        }
    }
    const teamConfig = configWeb.equipo || {};
    const bookingConfig = configWeb.booking || { requestDeposit: false, depositPercentage: 50 };
    
    const necesitaSenia = bookingConfig.requestDeposit && bookingConfig.depositPercentage > 0;
    
    let nuevoEstado = necesitaSenia ? 'esperando_senia' : 'confirmado';
    let googleEventId = null;

    // --- CREACIÓN DEL EVENTO EN GOOGLE CALENDAR ---
    // Solo creamos el evento AHORA si NO necesita seña. 
    // Si necesita seña, se crea después cuando pagan.
    if (!necesitaSenia) {
        try {
            // 1. Identificamos el ID del profesional
            const serviceString = turno.servicio || "";
            const parts = serviceString.split(" - ");
            const workerName = parts.length > 1 ? parts[parts.length - 1] : null;
            const trabajadorElegido = configWeb.equipo?.items?.find((w: any) => w.nombre === workerName);
            const targetWorkerId = trabajadorElegido ? String(trabajadorElegido.id) : null;

            const event = await calendar.events.insert({
                calendarId: 'primary',
                requestBody: {
                    summary: `Turno: ${turno.cliente_nombre}`,
                    description: `Servicio: ${turno.servicio}\nTel: ${turno.cliente_telefono}\nCONFIRMADO`,
                    start: { dateTime: turno.fecha_inicio, timeZone: 'America/Argentina/Buenos_Aires' },
                    end: { dateTime: finalEndDate, timeZone: 'America/Argentina/Buenos_Aires' },
                    attendees: turno.cliente_email ? [{ email: turno.cliente_email }] : [],
                    // AGREGAMOS LA ETIQUETA DEL PROFESIONAL AQUÍ
                    extendedProperties: { 
                        shared: { 
                            saas_service_type: 'confirm_booking',
                            ...(targetWorkerId ? { saas_worker_id: targetWorkerId } : {})
                        } 
                    },
                    reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }, { method: 'email', minutes: 1440 }] }
                }
            });
            // Guardamos el ID para actualizar Supabase
            googleEventId = event.data.id;
        } catch (calendarError) {
            console.error("Error al crear evento en Calendar:", calendarError);
        }
    }
    // ---------------------------------------------

    // 4. Enviar Email
    const templateType = necesitaSenia ? 'deposit' : 'confirmation';
    const notifConfig = configWeb.notifications?.[templateType] || { enabled: true, sendViaEmail: true, sendViaWhatsapp: true };

    if (notifConfig.enabled) {
        const precioNumerico = finalPrice || 0;
        const depositAmount = necesitaSenia ? (precioNumerico * bookingConfig.depositPercentage) / 100 : 0;
        
        const serviceString = turno.servicio || "";
        const parts = serviceString.split(" - ");
        const workerName = parts.length > 1 ? parts[parts.length - 1] : null;

        const trabajadorElegido = configWeb.equipo?.items?.find((w: any) => w.nombre === workerName);

        const fechaLegible = new Date(turno.fecha_inicio).toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
        });

        // Variables comunes para ambos canales
        const variablesNotificacion = {
            cliente: turno.cliente_nombre,
            servicio: turno.servicio,
            fecha: fechaLegible,
            profesional: workerName || '',
            precio_total: `$${precioNumerico}`, 
            monto_senia: `$${depositAmount}`,
            link_pago: "", 
            alias: trabajadorElegido?.aliasCvu || '',
            telefono_trabajador: trabajadorElegido?.telefono || '',
            duracion: `${finalDuration || '60'} min`,
            hora_fin: new Date(finalEndDate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
        };

        // --- CANAL: WHATSAPP ---
        if (notifConfig.sendViaWhatsapp && turno.cliente_telefono) {
            await sendWhatsAppNotification(
                turno.cliente_telefono, 
                templateType, 
                variablesNotificacion,
                negocio.whatsapp_access_token, // O instancia correspondiente
                notifConfig.whatsappBody || notifConfig.body, // Prioridad al texto de WA
                notifConfig.bannerUrl

            );
        }

        // --- CANAL: EMAIL ---
        if (notifConfig.sendViaEmail !== false && turno.cliente_email) {
            const emailData = compileEmailTemplate(templateType, configWeb, variablesNotificacion);

            if (emailData) {
                const gmail = google.gmail({ version: 'v1', auth });
                const utf8Subject = `=?utf-8?B?${Buffer.from(emailData.subject).toString('base64')}?=`;
                const messageParts = [
                    `To: ${turno.cliente_email}`,
                    'Content-Type: text/html; charset=utf-8',
                    'MIME-Version: 1.0',
                    `Subject: ${utf8Subject}`,
                    '',
                    emailData.html,
                ];
                
                const rawMessage = Buffer.from(messageParts.join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

                try {
                    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: rawMessage } });
                } catch (e) {
                    console.error("Error enviando correo:", e);
                }
            }
        }
    }

    // 5. Actualizar DB 
    const { error } = await supabase
      .from('turnos')
      .update({ 
          estado: nuevoEstado, 
          google_event_id: googleEventId, // Guardamos el ID del calendario aquí
          precio_total: finalPrice || 0,
          fecha_fin: finalEndDate
      })
      .eq('id', appointmentId)

    if (error) throw error

    revalidatePath('/dashboard')
    return { success: true }

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('Error approving:', error)
    return { success: false, error: msg }
  }
}

// --- AGREGAR: markDepositPaid ---
// Esta función es la que FINALMENTE crea el evento en Google cuando pagan.
export async function markDepositPaid(turnoId: string) {
    try {
        const { data: turno, error: tErr } = await supabase
            .from('turnos')
            .select('*, negocios(*)')
            .eq('id', turnoId)
            .single()

        if (tErr || !turno) throw new Error('Turno no encontrado');
        const negocio = turno.negocios;
        
        // Auth Google
        const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
        auth.setCredentials({ refresh_token: negocio.google_refresh_token })
        const calendar = google.calendar({ version: 'v3', auth })
        const gmail = google.gmail({ version: 'v1', auth });

        // 1. CHEQUEO DE DISPONIBILIDAD (CRÍTICO)
        // Como no bloqueamos antes, puede que alguien haya ocupado el lugar manualmente.
        const conflictCheck = await calendar.events.list({
            calendarId: 'primary',
            timeMin: turno.fecha_inicio, 
            timeMax: turno.fecha_fin,
            singleEvents: true,
            timeZone: 'America/Argentina/Buenos_Aires'
        })

        if (conflictCheck.data.items) {
            const configuracionWeb = negocio.config_web || {};
            const availabilityMode = configuracionWeb.equipo?.availabilityMode || 'global';
            
            // Identificar al profesional
            const serviceString = turno.servicio || "";
            const parts = serviceString.split(" - ");
            const workerName = parts.length > 1 ? parts[parts.length - 1] : null;
            const targetWorker = configuracionWeb.equipo?.items?.find((w: any) => w.nombre === workerName);
            const targetWorkerId = targetWorker ? String(targetWorker.id) : null;

            let capacity = 1;
            const isGlobal = availabilityMode === 'global' || availabilityMode === 'sala_unica';
            const permiteSimultaneo = targetWorker?.allowSimultaneous === true || String(targetWorker?.allowSimultaneous) === 'true';

            if (!isGlobal && permiteSimultaneo) {
                capacity = Number(targetWorker?.simultaneousCapacity) || 2;
            }

            let overlappingCount = 0;
            const events = conflictCheck.data.items || [];
            
            for (const existingEvent of events) {
                // Ignoramos eventos transparentes o cancelados en Google Calendar
                if (existingEvent.transparency === 'transparent' || existingEvent.status === 'cancelled') continue;

                const shared = (existingEvent.extendedProperties?.shared as any) || {};
                const eventWorkerId = shared['saas_worker_id'] ? String(shared['saas_worker_id']).trim() : null;

                if (availabilityMode === 'global') {
                    // Si es SALA ÚNICA, cualquier evento que exista suma 1 a la ocupación, ignorando de quién sea
                    overlappingCount += 1; 
                } else {
                    // Si es POR PROFESIONAL, sumamos 1 solo si el evento es de ESTE profesional 
                    // (o si no tiene ID, lo que significa un bloqueo manual del calendario)
                    if (!eventWorkerId || (targetWorkerId && eventWorkerId === targetWorkerId)) {
                        overlappingCount += 1; 
                    }
                }
            }

            if (overlappingCount >= capacity) {
                throw new Error('⚠️ ¡CUIDADO! La capacidad de este horario se llenó mientras esperábamos el pago. Por favor, selecciona otro horario.');
            }
        }

        // 2. Crear Evento en Google
        const serviceStringGoogle = turno.servicio || "";
        const partsGoogle = serviceStringGoogle.split(" - ");
        const workerNameGoogle = partsGoogle.length > 1 ? partsGoogle[partsGoogle.length - 1] : null;
        const targetWorkerGoogle = negocio.config_web?.equipo?.items?.find((w: any) => w.nombre === workerNameGoogle);
        const targetWorkerId = targetWorkerGoogle ? String(targetWorkerGoogle.id) : null;

        const event = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary: `Turno: ${turno.cliente_nombre}`,
                description: `Servicio: ${turno.servicio}\nTel: ${turno.cliente_telefono}\nSEÑA ABONADA - CONFIRMADO`,
                start: { dateTime: turno.fecha_inicio, timeZone: 'America/Argentina/Buenos_Aires' },
                end: { dateTime: turno.fecha_fin, timeZone: 'America/Argentina/Buenos_Aires' },
                attendees: turno.cliente_email ? [{ email: turno.cliente_email }] : [],
                extendedProperties: { 
                    shared: { 
                        saas_service_type: 'confirm_booking',
                        // Ahora sí reconoce targetWorkerId perfectamente
                        ...(targetWorkerId ? { saas_worker_id: targetWorkerId } : {})
                    } 
                },
                reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }, { method: 'email', minutes: 1440 }] }
            }
        })

        const configWeb = negocio.config_web || {};
        const bookingConfig = configWeb.booking || { depositPercentage: 50 };
        const notifConfig = configWeb.notifications?.['confirmation'] || { enabled: true, sendViaEmail: true, sendViaWhatsapp: false };

        if (notifConfig.enabled) {
            // A. Recuperamos valores
            const precioTotal = turno.precio_total || 0; 
            const porcentajeSenia = bookingConfig.depositPercentage || 50;

            // B. Calculamos
            const montoPagado = (precioTotal * porcentajeSenia) / 100;
            const saldoRestante = precioTotal - montoPagado;
            
            // Formatear Fecha
            const fechaLegible = new Date(turno.fecha_inicio).toLocaleString('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires',
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });

            // Buscar al profesional
            const serviceString = turno.servicio || "";
            const parts = serviceString.split(" - ");
            const workerName = parts.length > 1 ? parts[parts.length - 1] : null;
            const trabajadorElegido = configWeb.equipo?.items?.find((w: any) => w.nombre === workerName);

            const variablesNotificacion = {
                cliente: turno.cliente_nombre,
                servicio: turno.servicio,
                fecha: fechaLegible,
                precio_total: `$${precioTotal}`,     
                monto_senia: `$${montoPagado}`,      
                precio_a_pagar: `$${saldoRestante}`, 
                alias: trabajadorElegido?.aliasCvu || '',
                telefono_trabajador: trabajadorElegido?.telefono || '',
                profesional: workerName || ''
            };

            // --- CANAL: WHATSAPP ---
            if (notifConfig.sendViaWhatsapp && turno.cliente_telefono && negocio.whatsapp_access_token) {
                try {
                    await sendWhatsAppNotification(
                        turno.cliente_telefono,
                        'confirmation',
                        variablesNotificacion,
                        negocio.whatsapp_access_token,
                        // CAMBIO: Usar whatsappBody con fallback a body
                        notifConfig.whatsappBody || notifConfig.body, 
                        // CAMBIO: Agregar el bannerUrl como 6to parámetro
                        notifConfig.bannerUrl 
                    );
                } catch(e) {
                    console.error("Error WhatsApp confirmación final:", e);
                }
            }

            // --- CANAL: EMAIL ---
            if (notifConfig.sendViaEmail !== false && turno.cliente_email) {
                const emailData = compileEmailTemplate('confirmation', configWeb, variablesNotificacion);

                if (emailData) {
                    const utf8Subject = `=?utf-8?B?${Buffer.from(emailData.subject).toString('base64')}?=`;
                    const messageParts = [
                        `To: ${turno.cliente_email}`,
                        'Content-Type: text/html; charset=utf-8',
                        'MIME-Version: 1.0',
                        `Subject: ${utf8Subject}`,
                        '',
                        emailData.html,
                    ];
                    const rawMessage = Buffer.from(messageParts.join('\n')).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
                    try { 
                        await gmail.users.messages.send({ userId: 'me', requestBody: { raw: rawMessage } }); 
                    } catch(e) { console.error("Error Email confirmación final:", e); }
                }
            }
        }

        // 4. Actualizar DB
        const { error } = await supabase
            .from('turnos')
            .update({ estado: 'confirmado', google_event_id: event.data.id })
            .eq('id', turnoId);

        if (error) throw error;
        revalidatePath('/dashboard');
        return { success: true };

    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.error('Error marking paid:', error);
        return { success: false, error: msg };
    }
}

// --- CANCEL ---
export async function cancelAppointment(appointmentId: string) {
  try {
    // Verificar autenticación y obtener el negocio del usuario autenticado
    const negocioId = await getAuthenticatedNegocioId();
    if (negocioId === null) return { success: false, error: 'No autorizado.' };

    // 1. Obtener datos del turno, tokens y configuración web
    const { data: turno, error: turnoError } = await supabase
      .from('turnos')
      .select('*, negocios(google_refresh_token, whatsapp_access_token, config_web)')
      .eq('id', appointmentId)
      .single()

    if (turnoError || !turno) throw new Error('Turno no encontrado')

    // Verificar que el turno pertenezca al negocio del usuario autenticado
    if (turno.negocio_id !== negocioId) return { success: false, error: 'No autorizado.' };

    // Extraemos los datos del negocio
    const negocio = turno.negocios as any;
    const refreshToken = negocio?.google_refresh_token;
    
    if (!refreshToken) throw new Error('No se pudo conectar con Google Calendar del negocio')

    // 2. Auth con Google (Necesitamos auth tanto para Calendar como para Gmail)
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    auth.setCredentials({ refresh_token: refreshToken })
    const calendar = google.calendar({ version: 'v3', auth })
    const gmail = google.gmail({ version: 'v1', auth }) // <-- Instancia de Gmail agregada

    // 3. Eliminar de Google Calendar
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

    // --- 5. NOTIFICACIONES DE CANCELACIÓN ---
    const fechaLegible = new Date(turno.fecha_inicio).toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    const variablesNotificacion = {
        cliente: turno.cliente_nombre,
        servicio: turno.servicio,
        fecha: fechaLegible
    };

    // 5.1 Enviar WhatsApp
    const wpToken = negocio?.whatsapp_access_token;
    if (wpToken && turno.cliente_telefono) {
      try {
        await sendWhatsAppNotification(
            turno.cliente_telefono,
            'cancellation', // Asegúrate de que esta template exista en tu helper de WhatsApp
            variablesNotificacion,
            wpToken
        );
      } catch (wsError) {
         console.error('Error enviando WhatsApp de cancelación:', wsError);
      }
    }

    // 5.2 Enviar Email
    if (turno.cliente_email && negocio.config_web) {
      try {
        const emailData = compileEmailTemplate(
            'cancellation', // Asegúrate de que esta template exista en config_web
            negocio.config_web,
            variablesNotificacion
        );

        if (emailData) {
            const utf8Subject = `=?utf-8?B?${Buffer.from(emailData.subject).toString('base64')}?=`;
            const messageParts = [
              `To: ${turno.cliente_email}`,
              'Content-Type: text/html; charset=utf-8',
              'MIME-Version: 1.0',
              `Subject: ${utf8Subject}`,
              '',
              emailData.html, 
            ];
            
            const rawMessage = Buffer.from(messageParts.join('\n'))
              .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            await gmail.users.messages.send({
              userId: 'me',
              requestBody: { raw: rawMessage },
            });
        }
      } catch (emailError) {
          console.error("No se pudo enviar el mail de cancelación:", emailError);
      }
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
      google_event_id: event.data.id,
      recordatorio_enviado: false
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