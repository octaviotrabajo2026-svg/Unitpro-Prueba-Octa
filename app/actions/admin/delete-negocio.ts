'use server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const PROJECT_ID_VERCEL = process.env.PROJECT_ID_VERCEL;
const TEAM_ID_VERCEL = process.env.TEAM_ID_VERCEL;
const AUTH_BEARER_TOKEN = process.env.AUTH_BEARER_TOKEN;

const getVercelEndpoint = (path: string) => {
  const baseUrl = `https://api.vercel.com/${path}`;
  return TEAM_ID_VERCEL ? `${baseUrl}?teamId=${TEAM_ID_VERCEL}` : baseUrl;
};

export async function deleteNegocio(negocioId: number) {
  try {
    // 1. Obtener el user_id antes de borrar el negocio
    const { data: negocio } = await supabase
      .from('negocios')
      .select('user_id, custom_domain')
      .eq('id', negocioId)
      .single();

    if (negocio?.custom_domain) {
      try {
        await fetch(getVercelEndpoint(`v9/projects/${PROJECT_ID_VERCEL}/domains/${negocio.custom_domain}`), {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${AUTH_BEARER_TOKEN}` },
        });
      } catch (e) {
        console.error('Error removing domain from Vercel:', e);
      }
    }


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