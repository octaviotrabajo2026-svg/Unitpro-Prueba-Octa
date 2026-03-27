// blocks/calendar/actions/check-availability.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface BusyInterval {
  start: string | null | undefined;
  end: string | null | undefined;
}

export type CheckAvailabilityResult = 
  | {
      success: true;
      busy: BusyInterval[];
      timeZone: string;
      mode: string;
    }
  | {
      success: false;
      error: string;
    }

/**
 * Verifica la disponibilidad de horarios para una fecha específica.
 * 
 * @param slug - Slug del negocio
 * @param dateStr - Fecha en formato YYYY-MM-DD
 * @param workerId - ID del profesional (opcional, para filtrar por profesional)
 */
export async function checkAvailability(
  slug: string,
  dateStr: string,
  workerId?: string
): Promise<CheckAvailabilityResult> {
  try {
    const { data: negocio, error: negocioError } = await supabase
      .from('negocios')
      .select('id, google_refresh_token, config, config_web')
      .eq('slug', slug)
      .single()

    if (negocioError || !negocio) {
      return { success: false, error: 'Negocio no encontrado' }
    }

    if (!negocio.google_refresh_token) {
      return { success: false, error: 'Google Calendar no está conectado' }
    }

    const config = negocio.config || {}
    const timeZone = config.timezone || 'America/Argentina/Buenos_Aires'

    // Ventana amplia: ayer → pasado mañana (cubre eventos que cruzan medianoche)
    const startWindow = new Date(dateStr)
    startWindow.setDate(startWindow.getDate() - 1)
    const endWindow = new Date(dateStr)
    endWindow.setDate(endWindow.getDate() + 2)

    // Auth con Google
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID, 
      process.env.GOOGLE_CLIENT_SECRET
    )
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    // Obtener eventos
    const eventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startWindow.toISOString(),
      timeMax: endWindow.toISOString(),
      singleEvents: true,
      timeZone,
    })

    const events = eventsResponse.data.items || []
    const availabilityMode = negocio.config_web?.equipo?.availabilityMode || 'global'

    // Filtrar eventos según el modo de disponibilidad
    const busyIntervals: BusyInterval[] = events
      .filter(event => {
        // Ignorar eventos transparentes (mostrar como disponible)
        if (event.transparency === 'transparent') return false
        // Ignorar eventos cancelados
        if (event.status === 'cancelled') return false
        
        const start = event.start?.dateTime || event.start?.date
        if (!start) return false

        // Obtener ID del profesional del evento
        const shared = (event.extendedProperties?.shared as Record<string, string>) || {}
        const eventWorkerId = shared['saas_worker_id']?.trim() || null
        const targetWorkerId = workerId?.trim() || null

        // Modo global/sala_unica: todos los eventos bloquean
        if (availabilityMode === 'global' || availabilityMode === 'sala_unica') {
          return true
        }

        // Modo por profesional:
        // - Evento sin ID bloquea a todos (ej: feriado, vacaciones)
        // - Evento con ID solo bloquea a ese profesional
        if (!eventWorkerId) return true
        if (targetWorkerId && eventWorkerId === targetWorkerId) return true
        
        return false
      })
      .map(event => ({
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
      }))

    return { 
      success: true, 
      busy: busyIntervals, 
      timeZone, 
      mode: availabilityMode 
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('[CALENDAR] Error checking availability:', message)
    return { success: false, error: message }
  }
}