import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const slug = searchParams.get("state"); 
  const error = searchParams.get("error");

  // 1. Manejo de errores o cancelación por parte del usuario
  if (error) {
     return NextResponse.redirect(new URL(`/${slug}?error=google_denied`, request.url));
  }
  if (!code || !slug) {
     return NextResponse.json({ error: "Faltan parámetros code o slug" }, { status: 400 });
  }

  // 2. Configuración (Igual que en auth)
  const DOMINIO_REAL = process.env.NEXT_PUBLIC_APP_URL || "https://unitpro-advance.vercel.app";
  const redirectUri = `${DOMINIO_REAL}/api/google/callback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );

  try {
    // 3. Canjear código por tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // 4. Guardar en Supabase
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Actualizamos el negocio con los tokens
    const { error: dbError } = await supabaseAdmin
      .from("negocios")
      .update({
        google_calendar_connected: true,
        // Solo guardamos el refresh_token si Google nos lo envía (generalmente solo la primera vez)
        ...(tokens.refresh_token && { google_refresh_token: tokens.refresh_token }),
        google_access_token: tokens.access_token,
      })
      .eq("slug", slug);

    if (dbError) throw dbError;

    // 5. ¡ÉXITO! Redirigir al dashboard para que el usuario vea "Conectado"
    return NextResponse.redirect(new URL(`/${slug}/dashboard?google_connected=true`, request.url));

  } catch (err: any) {
    console.error("Error OAuth Final:", err.message);
    // Si falla algo inesperado, redirigimos con error
     return NextResponse.redirect(new URL(`/${slug}/dashboard?error=auth_failed`, request.url));
  }
}