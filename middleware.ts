import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Iniciamos la respuesta limpia (Esto soluciona el 404 Edge de Vercel)
  let response = NextResponse.next();

  const url = request.nextUrl;
  const host = request.headers.get("host")?.toLowerCase() || "";
  
  // Limpiamos la variable por si tiene espacios o protocolos
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.replace("https://", "").replace("http://", "").trim().toLowerCase();

  // 2. CONFIGURACIÓN SUPABASE
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next()
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  try { await supabase.auth.getUser() } catch {}

  // 3. EXCEPCIONES PARA RECURSOS INTERNOS
  if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/api") || url.pathname.startsWith("/static")) {
    return response;
  }

  // 4. SI ES TU DOMINIO PRINCIPAL (O el link de Vercel)
  if (host === rootDomain || host.includes("vercel.app") || host.startsWith("localhost")) {
    return response;
  }

  // 5. SI ES UN SUBDOMINIO CLIENTE: REESCRIBIMOS LA RUTA
  const searchParams = url.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ""}`;

  return NextResponse.rewrite(
    new URL(`/${host}${path}`, request.url)
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/confirm|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};