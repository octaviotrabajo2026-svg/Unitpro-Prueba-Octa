// blocks/calendar/actions/block-time.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
import { google } from 'googleapis'
import { revalidatePath } from 'next/cache'

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

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface BlockTimePayload {
  start: string;        // ISO datetime
  end: string;          // ISO datetime
  reason?: string;      // Motivo del bloqueo
  workerId?: string;    // ID del profesional (opcional)
  workerName?: string;  // Nombre del profesional
}

export interface BlockTimeResult {
  success: boolean;
  error?: string;
  eventId?: string;
}

// ─── Acción Principal ────────────────────────────────────────────────────────

/**
 * Bloquea un horario en el calendario (sin crear turno).
 * Útil para vacaciones, feriados, descansos, etc.
 */
export async function blockTime(
  slug: string,
  blockData: BlockTimePayload
): Promise<BlockTimeResult> {
  try {
    // ═══ 1. VERIFICAR AUTENTICACIÓN ═══════════════════════════════════════════
    const negocioId = await getAuthenticatedNegocioId()
    if (negocioId === null) {
      return { success: false, error: 'No autorizado' }
    }

    // ═══ 2. OBTENER NEGOCIO ═══════════════════════════════════════════════════
    const { data: negocio, error: negocioError } = await supabase
      .from('negocios')
      .select('id, google_refresh_token, config_web')
      .eq('slug', slug)
      .single()

    if (negocioError || !negocio) {
      return { success: false, error: 'Negocio no encontrado' }
    }

    if (negocio.id !== negocioId) {
      return { success: false, error: 'No autorizado' }
    }

    if (!negocio.google_refresh_token) {
      return { success: false, error: 'Google Calendar no está conectado' }
    }

    // ═══ 3. CREAR EVENTO DE BLOQUEO EN GOOGLE CALENDAR ════════════════════════
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    const summary = blockData.reason 
      ? `🚫 ${blockData.reason}` 
      : '🚫 Horario Bloqueado'

    const description = [
      blockData.reason ? `Motivo: ${blockData.reason}` : '',
      blockData.workerName ? `Profesional: ${blockData.workerName}` : '',
      'Bloqueado desde el panel de administración',
    ].filter(Boolean).join('\n')

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary,
        description,
        start: { 
          dateTime: blockData.start, 
          timeZone: 'America/Argentina/Buenos_Aires' 
        },
        end: { 
          dateTime: blockData.end, 
          timeZone: 'America/Argentina/Buenos_Aires' 
        },
        // Marcar como ocupado para que bloquee disponibilidad
        transparency: 'opaque',
        extendedProperties: {
          shared: {
            saas_service_type: 'time_block',
            saas_worker_id: blockData.workerId || '',
          },
        },
      },
    })

    // ═══ 4. REVALIDAR Y RETORNAR ══════════════════════════════════════════════
    revalidatePath('/dashboard')

    return { 
      success: true, 
      eventId: event.data.id || undefined 
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[CALENDAR] Error blocking time:', error)
    return { success: false, error: message }
  }
}

/**
 * Elimina un bloqueo de horario.
 */
export async function unblockTime(
  slug: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar autenticación
    const negocioId = await getAuthenticatedNegocioId()
    if (negocioId === null) {
      return { success: false, error: 'No autorizado' }
    }

    // Obtener negocio
    const { data: negocio } = await supabase
      .from('negocios')
      .select('id, google_refresh_token')
      .eq('slug', slug)
      .single()

    if (!negocio || negocio.id !== negocioId) {
      return { success: false, error: 'No autorizado' }
    }

    if (!negocio.google_refresh_token) {
      return { success: false, error: 'Google Calendar no está conectado' }
    }

    // Eliminar evento
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    auth.setCredentials({ refresh_token: negocio.google_refresh_token })
    const calendar = google.calendar({ version: 'v3', auth })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId,
    })

    revalidatePath('/dashboard')

    return { success: true }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[CALENDAR] Error unblocking time:', error)
    return { success: false, error: message }
  }
}