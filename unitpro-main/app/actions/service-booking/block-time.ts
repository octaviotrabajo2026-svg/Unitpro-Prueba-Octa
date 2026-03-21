'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { google } from 'googleapis'
import { revalidatePath } from 'next/cache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Verifica que el slug del negocio pertenezca al usuario autenticado.
 * Retorna true si tiene ownership, false en caso contrario.
 */
async function verifyNegocioSlugOwnership(slug: string): Promise<boolean> {
  const serverClient = await createServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('negocios')
    .select('id')
    .eq('slug', slug)
    .eq('user_id', user.id)
    .single();

  return !!data;
}

type BlockData = {
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  reason: string;     // Ej: "Feriado", "Médico"
  workerId?: string;  // Si es null, bloquea a TODOS.
  isAllDay: boolean;
}

export async function blockTime(slug: string, data: BlockData) {
  try {
    // Verificar que el usuario autenticado sea dueño del negocio
    const isOwner = await verifyNegocioSlugOwnership(slug);
    if (!isOwner) return { success: false, error: 'No autorizado.' };

    // 1. Obtener credenciales del negocio
    const { data: negocio } = await supabase
      .from('negocios')
      .select('id, google_refresh_token, config')
      .eq('slug', slug)
      .single()

    if (!negocio?.google_refresh_token) throw new Error('Negocio no conectado')

    const config = negocio.config || {}
    const timeZone = config.timezone || 'America/Argentina/Buenos_Aires'

    // 2. Autenticación Google
    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    // 3. Definir inicio y fin
    let startDateTime: string;
    let endDateTime: string;

    if (data.isAllDay) {
        // Truco: Para bloquear todo el día en tu sistema de turnos, 
        // ponemos de 00:00 a 23:59 del mismo día.
        startDateTime = `${data.date}T00:00:00`;
        endDateTime = `${data.date}T23:59:59`;
    } else {
        startDateTime = `${data.date}T${data.startTime}:00`;
        endDateTime = `${data.date}T${data.endTime}:00`;
    }

    // 4. Configurar propiedades extendidas
    // Si data.workerId viene vacío, NO ponemos la propiedad. 
    // Tu check-availability.ts leerá esto como "Evento sin dueño" -> BLOQUEO TOTAL.
    const extendedProperties: any = {
        shared: {
            saas_type: 'block', // Etiqueta para diferenciarlo
        }
    };

    if (data.workerId && data.workerId !== 'all') {
        extendedProperties.shared.saas_worker_id = data.workerId;
    }

    // 5. Crear el evento
    await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
            summary: `⛔ BLOQUEO: ${data.reason}`,
            description: `Bloqueo manual desde el sistema.`,
            start: { dateTime: startDateTime, timeZone },
            end: { dateTime: endDateTime, timeZone },
            extendedProperties: extendedProperties,
            transparency: 'opaque', // 'opaque' significa Ocupado
        }
    });

    revalidatePath('/dashboard');
    return { success: true, message: 'Horario bloqueado correctamente' }

  } catch (error: any) {
    console.error('Error blocking time:', error)
    return { success: false, error: error.message }
  }
}
export async function getBlocks(slug: string) {
  try {
    const { data: negocio } = await supabase
      .from('negocios')
      .select('google_refresh_token, config')
      .eq('slug', slug)
      .single()

    if (!negocio?.google_refresh_token) return { success: false, error: 'No conectado' }

    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    // Traemos eventos desde HOY hacia adelante
    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    // Filtramos solo los que sean de tipo "block" (nuestra marca especial)
    const blocks = (events.data.items || [])
      .filter(ev => ev.extendedProperties?.shared?.saas_type === 'block')
      .map(ev => ({
        id: ev.id,
        summary: ev.summary,
        start: ev.start?.dateTime || ev.start?.date,
        end: ev.end?.dateTime || ev.end?.date,
        workerId: ev.extendedProperties?.shared?.saas_worker_id || 'all'
      }));

    return { success: true, blocks };

  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteBlock(slug: string, eventId: string) {
  try {
    const { data: negocio } = await supabase
      .from('negocios')
      .select('google_refresh_token')
      .eq('slug', slug)
      .single()

    if (!negocio?.google_refresh_token) throw new Error('No conectado')

    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId
    });

    revalidatePath('/dashboard');
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}