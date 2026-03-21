'use server'

import { createClient } from '@/lib/supabase-server'

/**
 * Cambia la contraseña de un usuario validando primero su contraseña actual.
 * Este flujo es para usuarios con sesión activa dentro del dashboard.
 */
export async function updatePasswordWithOld(oldPassword: string, newPassword: string) {
  const supabase = await createClient();

  // 1. Obtener el usuario actual para recuperar su email
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user?.email) {
    return { success: false, error: "No se encontró una sesión activa o el usuario no está autenticado." };
  }

  // 2. Re-autenticación (Seguridad crítica):
  // Intentamos iniciar sesión con la clave vieja. Si falla, el cambio se aborta.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: oldPassword,
  });

  if (signInError) {
    return { success: false, error: "La contraseña actual es incorrecta." };
  }

  // 3. Actualización:
  // Una vez validada la identidad, aplicamos la nueva contraseña.
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  });

  if (updateError) {
    return { success: false, error: "Error al actualizar: " + updateError.message };
  }

  return { success: true };
}

/**
 * Permite al negocio cambiar su propio email de login.
 * Requiere la contraseña actual para confirmar la identidad.
 */
export async function updateOwnEmail(
  newEmail: string,
  currentPassword: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // 1. Obtener usuario actual
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user?.email) {
    return { success: false, error: 'No se encontró sesión activa.' };
  }

  // 2. Re-autenticar con la contraseña actual
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (signInError) {
    return { success: false, error: 'La contraseña actual es incorrecta.' };
  }

  // Validar formato del nuevo email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    return { success: false, error: 'El nuevo email no es válido.' };
  }
  if (newEmail === user.email) {
    return { success: false, error: 'El nuevo email es igual al actual.' };
  }

  // 3. Cambiar email en Auth
  const { error: updateError } = await supabase.auth.updateUser({ email: newEmail });
  if (updateError) {
    return { success: false, error: 'Error al actualizar: ' + updateError.message };
  }

  // 4. Actualizar email en tabla negocios
  await supabase
    .from('negocios')
    .update({ email: newEmail })
    .eq('user_id', user.id);

  return { success: true };
}