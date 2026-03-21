'use server'

import { createClient } from "@/lib/supabase-server"; //
import { revalidatePath } from "next/cache";
import { getValidAccessToken } from "@/app/actions/shared/google-auth";

// --- ACCIÓN 1: REPROGRAMAR TURNO ---
export async function rescheduleBooking(turnoId: string, newDateIso: string) {
  // CORRECCIÓN AQUÍ: Agregamos 'await'
  const supabase = await createClient(); //

  try {
    // 1. Obtener datos del turno y del negocio
    const { data: turno } = await supabase
      .from('turnos')
      .select('*, negocios(google_refresh_token)')
      .eq('id', turnoId)
      .single();

    if (!turno) throw new Error('Turno no encontrado');
    if (!turno.google_event_id) throw new Error('Este turno no está sincronizado con Google Calendar');

    const refreshToken = turno.negocios?.google_refresh_token;
    if (!refreshToken) throw new Error('El negocio desconectó Google Calendar');

    // 2. Obtener Token Válido
    const accessToken = await getValidAccessToken(refreshToken);

    // 3. Calcular Hora Fin (Default 1h o mantener duración original)
    const start = new Date(newDateIso);
    const oldStart = new Date(turno.fecha_inicio);
    const oldEnd = new Date(turno.fecha_fin);
    // Si alguna fecha es inválida, usamos 1 hora por defecto
    const durationMs = (oldEnd.getTime() && oldStart.getTime())
        ? oldEnd.getTime() - oldStart.getTime()
        : 60 * 60 * 1000;

    const end = new Date(start.getTime() + durationMs);

    // 3.5 Verificar conflictos en el nuevo horario
    const conflictRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}&singleEvents=true`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    if (conflictRes.ok) {
      const conflictData = await conflictRes.json();
      const conflicts = (conflictData.items || []).filter(
        (ev: { transparency?: string; status?: string; id?: string }) =>
          ev.transparency !== 'transparent' &&
          ev.status !== 'cancelled' &&
          ev.id !== turno.google_event_id // Ignorar el evento que estamos reprogramando
      );
      if (conflicts.length > 0) {
        throw new Error('El nuevo horario ya tiene un evento en Google Calendar');
      }
    }

    // 4. Actualizar en Google Calendar
    const googleRes = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${turno.google_event_id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() }
      })
    });

    if (!googleRes.ok) {
        const err = await googleRes.json();
        console.error("Google Error:", err);
        throw new Error('Google rechazó la actualización');
    }

    // 5. Actualizar en Supabase (Solo si Google aceptó)
    const { error } = await supabase
      .from('turnos')
      .update({ 
        fecha_inicio: start.toISOString(),
        fecha_fin: end.toISOString()
      })
      .eq('id', turnoId);

    if (error) throw error;

    revalidatePath('/dashboard'); 
    return { success: true };

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(error);
    return { success: false, error: msg };
  }
}

// --- ACCIÓN 2: CANCELAR TURNO ---
export async function cancelBooking(turnoId: string) {
  // CORRECCIÓN AQUÍ: Agregamos 'await'
  const supabase = await createClient(); //

  try {
    // 1. Obtener datos
    const { data: turno } = await supabase
      .from('turnos')
      .select('*, negocios(google_refresh_token)')
      .eq('id', turnoId)
      .single();

    if (!turno) throw new Error('Turno no encontrado');

    // Si tiene evento de Google, lo borramos
    if (turno.google_event_id && turno.negocios?.google_refresh_token) {
        try {
            const accessToken = await getValidAccessToken(turno.negocios.google_refresh_token);
            
            await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${turno.google_event_id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
        } catch (e) {
            console.warn("No se pudo borrar de Google, pero continuamos con la cancelación local.", e);
        }
    }

    // 2. Marcar como cancelado en Supabase
    const { error } = await supabase
      .from('turnos')
      .update({ estado: 'cancelado' })
      .eq('id', turnoId);

    if (error) throw error;

    revalidatePath('/dashboard');
    return { success: true };

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    return { success: false, error: msg };
  }
}