import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  const host = request.headers.get("host")?.toLowerCase() || "";
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.replace("https://", "").replace("http://", "").trim().toLowerCase();

  // 1. DETERMINE THE ROUTE DESTINATION FIRST
  let isRewrite = false;
  const searchParams = url.searchParams.toString();
  const path = `${url.pathname}${searchParams.length > 0 ? `?${searchParams}` : ""}`;
  const rewriteUrl = `/${host}${path}`;

  // If it's NOT the root domain, NOT vercel, NOT localhost, AND NOT an internal Next.js file -> it's a subtenant rewrite
  if (
    host !== rootDomain && 
    !host.includes("vercel.app") && 
    !host.startsWith("localhost") &&
    !url.pathname.startsWith("/_next") && 
    !url.pathname.startsWith("/api") && 
    !url.pathname.startsWith("/static")
  ) {
    isRewrite = true;
  }

  // 2. INITIALIZE THE RESPONSE SAFELY
  // CRITICAL FIX: Passing { request } is mandatory so Vercel doesn't lose routing context.
  let response = isRewrite
    ? NextResponse.rewrite(new URL(rewriteUrl, request.url))
    : NextResponse.next({ request });

  // 3. INJECT SUPABASE
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          // Update the request cookies
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          
          // CRITICAL FIX: Recreate the specific response type, passing the request again
          response = isRewrite
            ? NextResponse.rewrite(new URL(rewriteUrl, request.url))
            : NextResponse.next({ request })
          
          // Apply the cookies to the new response
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Trigger Supabase to check/refresh the session (this might invoke setAll above)
  await supabase.auth.getUser()

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth/confirm|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};