// app/api/Whatsapp/setup-chatbot/route.ts
// Endpoint para activar/desactivar el chatbot de un negocio.
// Registra/desregistra el webhook en Evolution API y actualiza config_web.
// Requiere sesión autenticada del dueño del negocio.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // Verificar sesión del usuario
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { negocioId, enabled } = await req.json();
    if (!negocioId) {
      return NextResponse.json({ error: 'negocioId requerido' }, { status: 400 });
    }

    // Verificar que el usuario sea dueño del negocio
    const { data: negocio } = await supabaseAdmin
      .from('negocios')
      .select('id, slug, whatsapp_access_token, config_web')
      .eq('id', negocioId)
      .eq('user_id', user.id)
      .single();

    if (!negocio) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const instanceName = `negocio_${negocioId}`;
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '');
    const webhookUrl = `${appUrl}/api/Whatsapp/webhook`;

    // Registrar o desregistrar el webhook en Evolution API
    if (evolutionUrl && evolutionKey) {
      const webhookBody = enabled
        ? {
            url: webhookUrl,
            webhook_by_events: false,
            webhook_base64: false,
            events: ['MESSAGES_UPSERT'],
          }
        : { url: '', events: [] };

      const webhookRes = await fetch(
        `${evolutionUrl}/webhook/set/${instanceName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: evolutionKey,
          },
          body: JSON.stringify(webhookBody),
        }
      );

      if (!webhookRes.ok) {
        console.error(
          '[setup-chatbot] Error al configurar webhook en Evolution API:',
          await webhookRes.text()
        );
      }
    }

    // Actualizar config_web.chatbot.enabled preservando el resto de la config
    const configWeb = negocio.config_web ?? {};
    const updatedConfig = {
      ...configWeb,
      chatbot: { ...(configWeb.chatbot ?? {}), enabled },
    };

    await supabaseAdmin
      .from('negocios')
      .update({ config_web: updatedConfig })
      .eq('id', negocioId);

    return NextResponse.json({ ok: true, enabled });
  } catch (error) {
    console.error('[setup-chatbot] Error interno:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
