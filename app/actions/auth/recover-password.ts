'use server'

import { createClient } from '@/lib/supabase-server'

/**
 * Envía un correo de recuperación al usuario usando el flujo nativo de Supabase.
 */
export async function sendResetPasswordEmail(email: string) {
  const supabase = await createClient();
  const emailNormalizado = email.trim().toLowerCase();

  const { error } = await supabase.auth.resetPasswordForEmail(emailNormalizado, {
    // Redirigimos al servidor (API) para que canjee el código de seguridad
    // y le decimos (con ?next=...) a qué página visual debe llevarnos al final
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/actions/auth/confirm?next=/recover-password/reset`,
  });

  if (error) {
    console.error('Error al enviar reset email:', error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Esta función se usará en la página de destino para establecer la nueva clave.
 */
export async function setNewPassword(password: string) {
  const supabase = await createClient();

  // Actualizamos la contraseña del usuario autenticado (la sesión se establece en el frontend)
  const { error } = await supabase.auth.updateUser({
    password: password
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}