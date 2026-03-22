import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();

  const url = request.nextUrl;
  const host = request.headers.get("host")?.toLowerCase() || "";

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.replace("https://", "").replace("http://", "").trim().toLowerCase();

  if (url.pathname.startsWith("/_next") || url.pathname.startsWith("/api") || url.pathname.startsWith("/static")) {
    return response;
  }

  if (host === rootDomain || host.includes("vercel.app") || host.startsWith("localhost")) {
    return response;
  }

  const searchParams = url.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ""}`;

  return NextResponse.rewrite(new URL(`/${host}${path}`, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/confirm|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).)"],
};