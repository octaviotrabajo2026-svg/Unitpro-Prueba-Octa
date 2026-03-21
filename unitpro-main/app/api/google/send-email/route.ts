import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@/lib/supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { to, subject, message, negocioId } = await req.json();

    // Verificar sesión autenticada
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
    }

    // Verificar que el negocioId pertenezca al usuario autenticado
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: ownership } = await supabaseAdmin
      .from('negocios')
      .select('id')
      .eq('id', negocioId)
      .eq('user_id', user.id)
      .single();

    if (!ownership) {
      return NextResponse.json({ error: 'Acceso denegado.' }, { status: 403 });
    }

    // 1. Obtener tokens de Google del negocio
    const { data: negocio, error } = await supabaseAdmin
      .from('negocios')
      .select('google_access_token, google_refresh_token')
      .eq('id', negocioId)
      .single();

    if (error || !negocio?.google_refresh_token) {
      return NextResponse.json({ error: 'Google no conectado' }, { status: 400 });
    }

    // 2. Configurar cliente de Google
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: negocio.google_access_token,
      refresh_token: negocio.google_refresh_token,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // 3. Crear el mensaje en formato RFC 2822
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      `To: ${to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${utf8Subject}`,
      '',
      message,
    ];
    const rawMessage = Buffer.from(messageParts.join('\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 4. Enviar
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: rawMessage },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error Gmail API:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}