"use server";

import { createClient } from "@/lib/supabase-server";

export async function getCampaignAudience(negocioId: string, dateLimit: string) {
  const supabase = await createClient();

  try {
    // Buscamos turnos ANTERIORES a la fecha límite.
    // Ordenamos por fecha descendente para priorizar a los que vinieron hace menos tiempo (más recuperables).
    const { data, error } = await supabase
      .from('turnos')
      .select('cliente_nombre, cliente_email, fecha_inicio')
      .eq('negocio_id', negocioId)
      .lt('fecha_inicio', dateLimit) 
      .order('fecha_inicio', { ascending: false })
      .limit(2000); // Límite de seguridad

    if (error) throw new Error(error.message);

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error("Error fetching audience:", error);
    return { success: false, error: error.message };
  }
}