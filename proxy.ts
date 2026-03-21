import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next();

  const url = request.nextUrl;
  const host = request.headers.get("host")?.toLowerCase() || "";
  
  // Limpiamos la variable por si tiene espacios o https
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.replace("https://", "").replace("http://", "").trim().toLowerCase();

  // --- LOGS DE CONTROL (Miralos en la pestaña Logs de Vercel) ---
  console.log("LOG_HOST:", host);
  console.log("LOG_ROOT:", rootDomain);

  // 1. SI ES EL DOMINIO PRINCIPAL (O de Vercel/Localhost): NO HACEMOS REWRITE
  // Agregamos .vercel.app para que tu landing siempre cargue en la URL de prueba
  if (host === rootDomain || host.includes("vercel.app") || host.startsWith("localhost")) {
    return response;
  }

  // 2. CONFIGURACIÓN SUPABASE (Igual que antes)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  await supabase.auth.getUser()

  // 3. EXCEPCIONES
  if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/api") || url.pathname.startsWith("/static")) {
    return response;
  }

  // 4. REWRITE PARA CLIENTES (EJ: constructoras)
  const searchParams = url.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ""}`;

  return NextResponse.rewrite(
    new URL(`/${host}${path}`, request.url)
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/confirm|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};