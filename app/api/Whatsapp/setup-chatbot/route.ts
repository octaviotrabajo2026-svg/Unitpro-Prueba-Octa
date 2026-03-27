// app/api/whatsapp/setup-chatbot/route.ts
// Endpoint para activar/desactivar el chatbot de WhatsApp.
// Registra o desregistra el webhook en Evolution API y actualiza config_web.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verificar sesión del usuario
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { negocioId, enabled, instanceName } = await request.json();

    // Verificar que el usuario es dueño del negocio solicitado
    const { data: negocio } = await supabase
      .from('negocios')
      .select('id, config_web')
      .eq('id', negocioId)
      .eq('user_id', user.id)
      .single();

    if (!negocio) {
      return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionKey = process.env.EVOLUTION_API_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;

    if (!evolutionUrl || !evolutionKey) {
      return NextResponse.json(
        { error: 'Evolution API no configurada' },
        { status: 500 }
      );
    }

    if (enabled && instanceName) {
      // Registrar webhook en Evolution API para recibir mensajes
      try {
        await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionKey,
          },
          body: JSON.stringify({
            url: `${appUrl}/api/whatsapp/webhook`,
            webhook_by_events: true,
            webhook_base64: false,
            events: ['messages.upsert'],
          }),
        });
      } catch (e) {
        console.error('[SETUP-CHATBOT] Error registrando webhook en Evolution API:', e);
      }
    } else if (!enabled && instanceName) {
      // Desregistrar webhook al deshabilitar el chatbot
      try {
        await fetch(`${evolutionUrl}/webhook/set/${instanceName}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': evolutionKey,
          },
          body: JSON.stringify({
            url: '',
            webhook_by_events: false,
            events: [],
          }),
        });
      } catch (e) {
        console.error('[SETUP-CHATBOT] Error desregistrando webhook:', e);
      }
    }

    // Actualizar config_web.chatbot en Supabase
    const currentConfig = negocio.config_web || {};
    const updatedConfig = {
      ...currentConfig,
      chatbot: {
        ...(currentConfig.chatbot || {}),
        enabled,
        instanceName: instanceName || currentConfig.chatbot?.instanceName,
      },
    };

    await supabase
      .from('negocios')
      .update({ config_web: updatedConfig })
      .eq('id', negocioId);

    return NextResponse.json({ ok: true, enabled });
  } catch (error) {
    console.error('[SETUP-CHATBOT] Error:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
