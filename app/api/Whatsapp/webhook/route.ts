// app/api/Whatsapp/webhook/route.ts
// Endpoint receptor de webhooks de Evolution API.
// Procesa mensajes entrantes y genera respuestas con el bot de IA.
// IMPORTANTE: No usa 'use server' ni cookies() — usa service role key directamente.

import { NextResponse } from 'next/server';
import {
  handleWhatsAppMessage,
  resolveNegocioFromInstance,
  isMessageDuplicate,
} from '@/lib/whatsapp-bot';
import { sendWhatsAppNotification } from '@/lib/whatsapp-helper';
import type { EvolutionWebhookPayload } from '@/types/whatsapp-bot';

export async function GET() {
  return NextResponse.json({ status: 'active' });
}

export async function POST(req: Request) {
  try {
    const payload: EvolutionWebhookPayload = await req.json();

    // Solo procesar eventos de mensajes nuevos
    if (payload.event !== 'messages.upsert') {
      return NextResponse.json({ ok: true });
    }

    const { data, instance } = payload;

    // Ignorar mensajes propios del bot
    if (data?.key?.fromMe) return NextResponse.json({ ok: true });

    // Ignorar mensajes de grupos
    if (data?.key?.remoteJid?.endsWith('@g.us')) return NextResponse.json({ ok: true });

    // Deduplicación: ignorar si ya procesamos este mensaje
    if (data?.key?.id && isMessageDuplicate(data.key.id)) {
      return NextResponse.json({ ok: true });
    }

    // Extraer texto del mensaje (soporta texto directo y extendedTextMessage)
    const text =
      data?.message?.conversation ?? data?.message?.extendedTextMessage?.text ?? '';

    if (!text.trim()) {
      // Mensaje no textual: pedir al usuario que escriba
      const phone = data.key.remoteJid.replace('@s.whatsapp.net', '');
      await sendWhatsAppNotification(
        phone,
        'custom',
        {},
        instance,
        'Por favor, escribí tu consulta con texto 😊'
      );
      return NextResponse.json({ ok: true });
    }

    // Resolver negocio_id a partir del nombre de instancia
    const negocioId = resolveNegocioFromInstance(instance);
    if (!negocioId) {
      console.error('[Webhook] No se pudo resolver el negocio desde la instancia:', instance);
      return NextResponse.json({ ok: true });
    }

    const phone = data.key.remoteJid.replace('@s.whatsapp.net', '');
    const pushName = data.pushName;

    // Procesar el mensaje con el motor del bot
    const response = await handleWhatsAppMessage(negocioId, phone, text, pushName);

    // Enviar respuesta solo si el bot generó una
    if (response) {
      await sendWhatsAppNotification(phone, 'custom', {}, instance, response);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Webhook] Error al procesar el mensaje:', error);
    // Siempre retornar 200 para evitar reintentos de Evolution API
    return NextResponse.json({ ok: true });
  }
}
