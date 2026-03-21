'use server'

import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { BusyInterval } from '@/types/booking'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function checkAvailability(
  slug: string,
  dateStr: string,
  workerIdArg?: string
): Promise<{ success: true; busy: BusyInterval[]; timeZone: string; mode: string } | { success: false; error: string }> {
  try {
    const { data: negocio } = await supabase
      .from('negocios')
      .select('id, google_refresh_token, config, config_web')
      .eq('slug', slug)
      .single()

    if (!negocio?.google_refresh_token) return { success: false, error: 'Sin conexión a Calendar' }

    const config = negocio.config || {}
    const timeZone = config.timezone || 'America/Argentina/Buenos_Aires'

    // Ventana amplia: ayer → pasado mañana (cubre eventos que cruzan medianoche)
    const startWindow = new Date(dateStr)
    startWindow.setDate(startWindow.getDate() - 1)
    const endWindow = new Date(dateStr)
    endWindow.setDate(endWindow.getDate() + 2)

    const auth = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    const eventsResponse = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startWindow.toISOString(),
      timeMax: endWindow.toISOString(),
      singleEvents: true,
      timeZone,
    })

    const events = eventsResponse.data.items || []
    const availabilityMode = negocio.config_web?.equipo?.availabilityMode || 'global'

    const busyIntervals: BusyInterval[] = events
      .filter(event => {
        if (event.transparency === 'transparent') return false
        if (event.status === 'cancelled') return false
        const start = event.start?.dateTime || event.start?.date
        if (!start) return false

        const shared = (event.extendedProperties?.shared as Record<string, string>) || {}
        const rawId = shared['saas_worker_id']
        const eventWorkerId = rawId ? String(rawId).trim() : null
        const targetWorkerId = workerIdArg ? String(workerIdArg).trim() : null

        if (availabilityMode === 'global' || availabilityMode === 'sala_unica') return true

        // Modo Equipo: evento sin ID bloquea a todos; con ID bloquea solo al profesional coincidente
        if (!eventWorkerId) return true
        if (targetWorkerId && eventWorkerId === targetWorkerId) return true
        return false
      })
      .map(event => ({
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
      }))

    return { success: true, busy: busyIntervals, timeZone, mode: availabilityMode }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error checking availability:', message)
    return { success: false, error: message }
  }
}
