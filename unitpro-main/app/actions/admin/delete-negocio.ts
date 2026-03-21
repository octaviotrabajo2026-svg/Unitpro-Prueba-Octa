'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function deleteNegocio(negocioId: number) {
  try {
    // 1. Obtener el user_id antes de borrar el negocio
    const { data: negocio } = await supabase
      .from('negocios')
      .select('user_id')
      .eq('id', negocioId)
      .single();

    // 2. Borrar datos relacionados
    await supabase.from('tenant_blocks').delete().eq('negocio_id', negocioId);
    await supabase.from('resenas').delete().eq('negocio_id', negocioId);
    await supabase.from('turnos').delete().eq('negocio_id', negocioId);
    
    // 3. Borrar el negocio
    const { error } = await supabase.from('negocios').delete().eq('id', negocioId);
    if (error) throw error;

    // 4. Borrar el usuario de auth.users
    if (negocio?.user_id) {
      await supabase.auth.admin.deleteUser(negocio.user_id);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}