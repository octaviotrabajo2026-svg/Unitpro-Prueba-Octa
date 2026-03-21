import { NextResponse } from "next/server";
import { google } from "googleapis";

// Forzamos a que esta ruta no se guarde en caché (importante en Vercel)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  // 1. HARDCODE: Pon tu URL exacta de Vercel aquí (sin barra al final)
  const DOMINIO_REAL = process.env.NEXT_PUBLIC_APP_URL || "https://unitpro-advance.vercel.app"; 
  const redirectUri = `${DOMINIO_REAL}/api/google/callback`;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri 
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/gmail.send"

    ],
    state: slug || "",
    prompt: "consent",
    
    // 🔥 CRÍTICO: ESTA ES LA LÍNEA QUE TE FALTA O QUE FALLA
    // Al ponerla aquí, obligamos a la librería a escribir el parámetro en la URL
    redirect_uri: redirectUri 
  });

  return NextResponse.redirect(url);
}