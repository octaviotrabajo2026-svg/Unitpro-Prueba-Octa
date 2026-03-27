"use server";
// app/actions/admin/agency-actions.ts
// Acciones admin para gestionar la agencia: email, contraseña, datos, logo.
// Usa service role — requiere sesión autenticada y ownership del recurso.

import { createClient as createAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase-server";

const supabaseAdmin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Obtiene el usuario autenticado desde la sesión SSR.
 * Retorna null si no hay sesión válida.
 */
async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Verifica que el usuario autenticado sea la agencia dueña del negocio dado.
 * Retorna true si tiene ownership, false en caso contrario.
 */
async function verifyNegocioOwnership(
  negocioId: number,
  userId: string
): Promise<boolean> {
  // Camino 1: el usuario ES el dueño directo del negocio (autogestionado)
  const { data: direct } = await supabaseAdmin
    .from("negocios")
    .select("id")
    .eq("id", negocioId)
    .eq("user_id", userId)
    .maybeSingle();
  if (direct) return true;

  // Camino 2: el usuario es la agencia dueña del negocio
  const { data: viaAgency } = await supabaseAdmin
    .from("negocios")
    .select("id, agencies!inner(user_id)")
    .eq("id", negocioId)
    .eq("agencies.user_id", userId)
    .maybeSingle();
  return !!viaAgency;
}

// ── Cambiar contraseña del cliente (negocio) ──────────────────────────────────
export async function changeClientPassword(
  negocioId: number,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // Verificar sesión autenticada
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "No autorizado." };

  // Verificar que el usuario autenticado sea la agencia dueña del negocio
  const isOwner = await verifyNegocioOwnership(negocioId, user.id);
  if (!isOwner) return { success: false, error: "No autorizado." };

  if (!newPassword || newPassword.length < 8)
    return { success: false, error: "Mínimo 8 caracteres." };

  const { data: negocio, error: fetchErr } = await supabaseAdmin
    .from("negocios").select("user_id").eq("id", negocioId).single();

  if (fetchErr || !negocio?.user_id)
    return { success: false, error: "Usuario no encontrado." };

  const { error } = await supabaseAdmin.auth.admin.updateUserById(
    negocio.user_id, { password: newPassword }
  );
  return error ? { success: false, error: error.message } : { success: true };
}

// ── Cambiar email del cliente (negocio) ───────────────────────────────────────
export async function changeClientEmail(
  negocioId: number,
  newEmail: string
): Promise<{ success: boolean; error?: string }> {
  // Verificar sesión autenticada
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "No autorizado." };

  // Verificar que el usuario autenticado sea la agencia dueña del negocio
  const isOwner = await verifyNegocioOwnership(negocioId, user.id);
  if (!isOwner) return { success: false, error: "No autorizado." };

  if (!newEmail || !newEmail.includes("@"))
    return { success: false, error: "Email inválido." };

  const { data: negocio, error: fetchErr } = await supabaseAdmin
    .from("negocios").select("user_id").eq("id", negocioId).single();

  if (fetchErr || !negocio?.user_id)
    return { success: false, error: "Usuario no encontrado." };

  // Actualizar auth
  const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
    negocio.user_id, { email: newEmail }
  );
  if (authErr) return { success: false, error: authErr.message };

  // Actualizar tabla negocios
  await supabaseAdmin.from("negocios").update({ email: newEmail }).eq("id", negocioId);
  return { success: true };
}

// ── Cambiar datos de la agencia (nombre, email) ───────────────────────────────
export async function updateAgencyProfile(
  agencyId: number,
  userId: string,
  data: { nombre?: string; email?: string; logo_url?: string }
): Promise<{ success: boolean; error?: string }> {
  // Verificar sesión autenticada y que el usuario sea dueño del agencyId
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: "No autorizado." };

  const { data: agencyCheck } = await supabaseAdmin
    .from("agencies")
    .select("id")
    .eq("id", agencyId)
    .eq("user_id", user.id)
    .single();
  if (!agencyCheck) return { success: false, error: "No autorizado." };

  const updates: any = {};
  if (data.nombre)   { updates.nombre_agencia = data.nombre; }
  if (data.logo_url) { updates.logo_url = data.logo_url; }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabaseAdmin
      .from("agencies").update(updates).eq("id", agencyId);
    if (error) return { success: false, error: error.message };
  }

  // Si cambia el email, actualizar auth + tabla
  if (data.email) {
    const { error: authErr } = await supabaseAdmin.auth.admin
      .updateUserById(userId, { email: data.email });
    if (authErr) return { success: false, error: authErr.message };
    await supabaseAdmin.from("agencies").update({ email: data.email }).eq("id", agencyId);
  }

  return { success: true };
}

// ── Cambiar contraseña de la agencia ─────────────────────────────────────────
export async function changeAgencyPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || newPassword.length < 8)
    return { success: false, error: "Mínimo 8 caracteres." };

  const { error } = await supabaseAdmin.auth.admin
    .updateUserById(userId, { password: newPassword });
  return error ? { success: false, error: error.message } : { success: true };
}

// ── Buscar o crear el negocio-landing de la agencia ───────────────────────────
// Cada agencia tiene opcionalmente un negocio con is_agency_site=true
// que actúa como su propia landing pública.
export async function getOrCreateAgencyLanding(
  agencyId: number,
  agencySlug: string,
  agencyName: string
): Promise<{ success: boolean; negocio?: any; error?: string }> {
  // 1. Buscar si ya existe
  const { data: existing } = await supabaseAdmin
    .from("negocios")
    .select("*")
    .eq("agency_id", agencyId)
    .eq("is_agency_site", true)
    .single();

  if (existing) return { success: true, negocio: existing };

  // 2. Crear uno nuevo (sin user_id — pertenece a la agencia misma)
  const landingSlug = `${agencySlug}-landing-${Date.now()}`;
  const { data: nuevo, error } = await supabaseAdmin
    .from("negocios")
    .insert({
      agency_id:       agencyId,
      nombre:          agencyName,
      slug:            landingSlug,
      system:          "modular",
      is_agency_site:  true,
      estado_plan:     "activo",
      color_principal: "#577a2c",
      config_web:      { hero: { titulo: agencyName, mostrar: true } },
    })
    .select("*")
    .single();

  if (error) return { success: false, error: error.message };

  // Activar bloque landing por defecto
  await supabaseAdmin.from("tenant_blocks").insert({
    negocio_id: nuevo.id, block_id: "landing", active: true,
    activated_at: new Date().toISOString(), config: {},
  });

  return { success: true, negocio: nuevo };
}

// ── Eliminar negocio completo (datos + usuario Auth) ─────────────────────────
export async function deleteClientComplete(
  negocioId: number
): Promise<{ success: boolean; error?: string }> {
  // 1. Obtener user_id antes de borrar
  const { data: neg } = await supabaseAdmin
    .from("negocios").select("user_id").eq("id", negocioId).single();

  // 2. Borrar datos relacionados en orden por FK
  await supabaseAdmin.from("tenant_blocks").delete().eq("negocio_id", negocioId);
  await supabaseAdmin.from("resenas").delete().eq("negocio_id", negocioId);
  await supabaseAdmin.from("turnos").delete().eq("negocio_id", negocioId);

  const { error } = await supabaseAdmin.from("negocios").delete().eq("id", negocioId);
  if (error) return { success: false, error: error.message };

  // 3. Borrar usuario de Auth si tiene uno propio (negocios is_agency_site no tienen)
  if (neg?.user_id) {
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(neg.user_id);
    if (authErr) return { success: false, error: authErr.message };
  }

  return { success: true };
}

export async function toggleClientPlanStatus(
  negocioId: number,
  currentStatus: string
): Promise<{ success: boolean; error?: string; newStatus?: string }> {
  // Si está activo, lo pasamos a suspendido, y viceversa
  const newStatus = currentStatus === "activo" ? "suspendido" : "activo";
  
  const { error } = await supabaseAdmin
    .from("negocios")
    .update({ estado_plan: newStatus })
    .eq("id", negocioId);

  return error ? { success: false, error: error.message } : { success: true, newStatus };
}

// ── Helpers de billing ────────────────────────────────────────────────────────

async function getBillingEnforced(): Promise<{ negocio_ids: number[]; agency_ids: number[] }> {
  const { data } = await supabaseAdmin
    .from('platform_config')
    .select('value')
    .eq('key', 'billing_enforced')
    .maybeSingle();
  return (data?.value as any) ?? { negocio_ids: [], agency_ids: [] };
}

async function isBillingEnforced(negocioId: number): Promise<boolean> {
  const config = await getBillingEnforced();

  // Negocio autogestionado → revisar lista de negocios
  if (config.negocio_ids?.includes(negocioId)) return true;

  // Negocio con agencia → revisar lista de agencias
  const { data: neg } = await supabaseAdmin
    .from('negocios')
    .select('agency_id')
    .eq('id', negocioId)
    .maybeSingle();

  if (neg?.agency_id && config.agency_ids?.includes(neg.agency_id)) return true;

  return false;
}

async function getBlockPrice(blockId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from('platform_config')
    .select('value')
    .eq('key', 'block_prices')
    .maybeSingle();
  return (data?.value as any)?.[blockId] ?? 0;
}

// ── Billing de agencia sobre sus negocios ─────────────────────────────────────

async function getAgencyBillingEnforced(agencyId: number): Promise<number[]> {
  const { data } = await supabaseAdmin
    .from('agencies')
    .select('billing_enforced_negocios')
    .eq('id', agencyId)
    .maybeSingle();
  return (data?.billing_enforced_negocios as number[]) ?? [];
}

export async function isAgencyBillingEnforced(
  agencyId: number,
  negocioId: number
): Promise<boolean> {
  const list = await getAgencyBillingEnforced(agencyId);
  return list.includes(negocioId);
}

export async function toggleAgencyBillingForNegocio(
  agencyId: number,
  negocioId: number,
  enforce: boolean
): Promise<{ success: boolean; error?: string }> {
  const current = await getAgencyBillingEnforced(agencyId);
  const updated = enforce
    ? [...new Set([...current, negocioId])]
    : current.filter((id: number) => id !== negocioId);

  const { error } = await supabaseAdmin
    .from('agencies')
    .update({ billing_enforced_negocios: updated })
    .eq('id', agencyId);

  return error ? { success: false, error: error.message } : { success: true };
}

// ── Activar / desactivar bloque de un cliente (con enforcement condicional) ───
export async function toggleClientBlock(
  negocioId: number,
  blockId: string,
  activate: boolean
): Promise<{ success: boolean; error?: string }> {
  if (activate) {
    const shouldCharge = await isBillingEnforced(negocioId);

    if (shouldCharge) {
      const price = await getBlockPrice(blockId);
      if (price > 0) {
        // Importación dinámica para evitar circular dependency
        const { deductCoins } = await import('@/lib/unitcoins');
        const ok = await deductCoins(
          negocioId,
          price,
          `Activación de bloque: ${blockId}`,
          { block_id: blockId }
        );
        if (!ok) return { success: false, error: 'Saldo insuficiente de UnitCoins.' };
      }
    }

    const { error } = await supabaseAdmin
      .from('tenant_blocks')
      .upsert(
        { negocio_id: negocioId, block_id: blockId, active: true,
          activated_at: new Date().toISOString(), config: {} },
        { onConflict: 'negocio_id,block_id' }
      );
    return error ? { success: false, error: error.message } : { success: true };

  } else {
    const { error } = await supabaseAdmin
      .from('tenant_blocks')
      .update({ active: false })
      .eq('negocio_id', negocioId)
      .eq('block_id', blockId);
    return error ? { success: false, error: error.message } : { success: true };
  }
  
}
