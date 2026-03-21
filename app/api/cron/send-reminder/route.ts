import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { compileEmailTemplate } from '@/lib/email-helper';
import { sendWhatsAppNotification } from '@/lib/whatsapp-helper';

// IMPORTANTE: Al ser un cron, no hay cookies de usuario.
// Usamos la Service Role Key para tener acceso a "todos" los datos sin RLS.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  // 1. Seguridad: Verificar que la llamada viene de cron-job.org (o tu prueba)
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const twentyFourHoursLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 2. Buscar turnos que cumplan TODAS las condiciones:
    // - Entre ahora y 24hs
    // - Estado confirmado
    // - Recordatorio NO enviado
    // - Hacemos join con 'negocios' para tener el token de Google del dueño
    const { data: turnos, error } = await supabaseAdmin
      .from('turnos')
      .select(`
        *,
        negocios!inner (
          google_refresh_token,
          google_access_token,
          config_web,
          whatsapp_access_token
        )
      `)
      .eq('estado', 'confirmado')
      .eq('recordatorio_enviado', false)
      .gt('fecha_inicio', now.toISOString())
      .lt('fecha_inicio', twentyFourHoursLater.toISOString());

    if (error) throw error;
    if (!turnos || turnos.length === 0) {
      return NextResponse.json({ message: 'No hay recordatorios pendientes' });
    }

    const resultados = [];

    // 3. Iterar y enviar recordatorios
    for (const turno of turnos) {
      try {
        const refreshToken = turno.negocios.google_refresh_token;
        if (!refreshToken) {
            console.warn(`Negocio del turno ${turno.id} no tiene refresh token`);
            continue;
        }

        // Formatear la fecha para que sea legible para el cliente
        const fechaLegible = new Date(turno.fecha_inicio).toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        const configWeb = turno.negocios.config_web || {};
        const notifReminder = configWeb.notifications?.reminder || { enabled: true, sendViaEmail: true, sendViaWhatsapp: false };

        // --- CANAL 1: WHATSAPP ---
        if (notifReminder.sendViaWhatsapp && turno.cliente_telefono && turno.negocios.whatsapp_access_token) {
            try {
                await sendWhatsAppNotification(
                    turno.cliente_telefono,
                    'reminder',
                    {
                        cliente: turno.cliente_nombre,
                        servicio: turno.servicio,
                        fecha: fechaLegible
                    },
                    turno.negocios.whatsapp_access_token,
                    // Prioriza el texto de WhatsApp, si no existe usa el del email
                    notifReminder.whatsappBody || notifReminder.body, 
                    // Envía la imagen si está configurada en el banner
                    notifReminder.bannerUrl 
                );
            } catch (wsError) {
                console.error(`Error en WhatsApp para turno ${turno.id}:`, wsError);
                // No lanzamos el error para permitir que intente el email
            }
        }

        // --- CANAL 2: EMAIL ---
        const emailData = compileEmailTemplate(
            'reminder', 
            turno.negocios.config_web, 
            {
                cliente: turno.cliente_nombre,
                servicio: turno.servicio,
                fecha: fechaLegible,
                profesional: '' 
            }
        );

        // Si el mail está activado y hay datos del template, intentamos enviarlo
        if (emailData && notifReminder.sendViaEmail !== false) {
            try {
                const oauth2Client = new google.auth.OAuth2(
                    process.env.GOOGLE_CLIENT_ID,
                    process.env.GOOGLE_CLIENT_SECRET
                );
                oauth2Client.setCredentials({ refresh_token: refreshToken });
                const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

                const subject = emailData.subject;
                const message = emailData.html;
                const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
                
                const messageParts = [
                  `To: ${turno.cliente_email}`,
                  'Content-Type: text/html; charset=utf-8',
                  'MIME-Version: 1.0',
                  `Subject: ${utf8Subject}`,
                  '',
                  message,
                ];
                
                const rawMessage = Buffer.from(messageParts.join('\n'))
                  .toString('base64')
                  .replace(/\+/g, '-')
                  .replace(/\//g, '_')
                  .replace(/=+$/, '');

                await gmail.users.messages.send({
                  userId: 'me',
                  requestBody: { raw: rawMessage },
                });
            } catch (emailError) {
                console.error(`Error en Gmail para turno ${turno.id}:`, emailError);
                // No lanzamos el error para llegar al paso final de marcar como procesado
            }
        } else if (!emailData) {
            console.log(`Recordatorio por email desactivado o sin template para turno ${turno.id}`);
        }

        // --- PASO FINAL: MARCAR COMO ENVIADO EN SUPABASE ---
        // Se ejecuta siempre que el proceso no haya fallado catastróficamente antes.
        // Esto previene que el cron vuelva a procesar este turno aunque un canal haya fallado.
        await supabaseAdmin
          .from('turnos')
          .update({ recordatorio_enviado: true })
          .eq('id', turno.id);

        resultados.push({ id: turno.id, status: 'processed' });

      } catch (innerError: any) {
        // Este catch solo captura errores estructurales graves del bucle
        console.error(`Error procesando recordatorio turno ${turno.id}:`, innerError);
        resultados.push({ id: turno.id, status: 'error', error: innerError.message });
      }
    }

    return NextResponse.json({ processed: resultados.length, details: resultados });

  } catch (error: any) {
    console.error('Error general en cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}