import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const url = request.nextUrl;
  const host = request.headers.get("host")?.toLowerCase() || "";
  
  // Limpiamos el ROOT_DOMAIN de cualquier espacio o protocolo
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.replace("https://", "").replace("http://", "").toLowerCase();

  // 1. IMPORTANTE: Si es el dominio de Vercel o el Root Domain, NO HACEMOS REWRITE.
  // Esto permite que tu landing principal y login carguen normal.
  if (host === rootDomain || host.includes("vercel.app") || host.startsWith("localhost")) {
    return response;
  }

  // 2. Configuración de Supabase (se queda igual)
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

  // 3. Excepciones de archivos estáticos y API
  if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/api") || url.pathname.startsWith("/static")) {
    return response;
  }

  // 4. Lógica para subdominios/clientes (aquí es donde sucede la "magia")
  const searchParams = url.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ""}`;

  // Esto busca la carpeta [slug] en tu proyecto
  return NextResponse.rewrite(
    new URL(`/${host}${path}`, request.url)
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/confirm|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};