import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get("host")?.toLowerCase() || "";

  // Dejar pasar todo lo que sea vercel.app o localhost
  if (host.includes("vercel.app") || host.startsWith("localhost")) {
    return NextResponse.next();
  }

  // Para dominios personalizados, redirigir al slug
  const searchParams = url.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ""}`;

  return NextResponse.rewrite(new URL(`/${host}${path}`, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)" ],
};