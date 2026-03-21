// app/api/superadmin/auth/route.ts
// Autenticación del superadmin contra variables de entorno.
// Env vars requeridas: SUPERADMIN_USER, SUPERADMIN_PASSWORD
//
// POST  → valida credenciales, setea cookie httpOnly
// DELETE → destruye la sesión

import { NextResponse }                from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies }                     from 'next/headers';

export const SESSION_COOKIE = 'up_superadmin_session';

// Salt leído desde variable de entorno con fallback al valor anterior
const SALT = process.env.SUPERADMIN_SALT ?? 'unitpro_superadmin_salt_2026';

/** Token derivado de la contraseña — no expone la contraseña real */
export function deriveToken(password: string): string {
  return createHmac('sha256', SALT).update(password).digest('hex');
}

/**
 * Compara dos strings de forma segura contra timing attacks.
 * Usa timingSafeEqual de Node.js crypto para que el tiempo de comparación
 * sea constante independientemente de dónde difieren los strings.
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Ejecutamos la comparación igual para no filtrar longitud por tiempo
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function POST(req: Request) {
  try {
    const { user, password } = await req.json();

    const validUser = process.env.SUPERADMIN_USER;
    const validPass = process.env.SUPERADMIN_PASSWORD;

    if (!validUser || !validPass) {
      return NextResponse.json(
        { success: false, error: 'Superadmin no configurado en el servidor.' },
        { status: 503 }
      );
    }

    // Usar comparación resistente a timing attacks para usuario y contraseña
    const userMatch = safeCompare(user ?? '', validUser);
    const passMatch = safeCompare(password ?? '', validPass);

    if (!userMatch || !passMatch) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas.' },
        { status: 401 }
      );
    }

    const token = deriveToken(validPass);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      maxAge:   60 * 60 * 8, // 8 horas
      path:     '/',
      sameSite: 'strict',
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: 'Error interno.' }, { status: 500 });
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return NextResponse.json({ success: true });
}