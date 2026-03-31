// app/api/whatsapp/webhook/route.ts
// Webhook receptor de Evolution API para el chatbot de WhatsApp.
// Siempre responde 200 para que Evolution API no reintente.

import { NextRequest, NextResponse } from 'next/server';
import { handleWhatsAppMessage, resolveNegocioFromInstance } from '@/lib/whatsapp-bot';
import { sendWhatsApp } from '@/lib/notifications/channels/whatsapp';
import type { EvolutionWebhookPayload, EvolutionMessageData } from '@/types/whatsapp-bot';

// Dedup en memoria: evita procesar el mismo message.id dos veces (TTL 60s)
const processedMessages = new Map<string, number>();

/** Limpia entradas de dedup con más de 60 segundos de antigüedad. */
function cleanupProcessed() {
  const now = Date.now();
  for (const [id, ts] of processedMessages.entries()) {
    if (now - ts > 60_000) processedMessages.delete(id);
  }
}

export async function POST(request: NextRequest) {
  console.log('[WEBHOOK] Mensaje recibido');
  try {
    const body: EvolutionWebhookPayload = await request.json();
    console.log('[WEBHOOK RAW]', JSON.stringify(body));
    console.log('[WEBHOOK] Payload:', JSON.stringify(body, null, 2));

    // Aceptar tanto el formato v1 (messages.upsert) como v2 (MESSAGES_UPSERT), case-insensitive
    const eventName = body.event?.toLowerCase();
    if (eventName !== 'messages.upsert') {
      return NextResponse.json({ ok: true });
    }

    // Compatibilidad v1/v2:
    // - v2: data es un array de mensajes → data[0]
    // - v1 variante: data.messages[0]
    // - v1 directo: data es el objeto mensaje
    const msgData: EvolutionMessageData | undefined =
      Array.isArray(body.data)
        ? (body.data as EvolutionMessageData[])[0]
        : (body.data as any)?.messages?.[0] ?? (body.data as EvolutionMessageData);

    if (!msgData?.key) {
      return NextResponse.json({ ok: true });
    }

    // Ignorar mensajes enviados por el bot mismo
    if (msgData?.key?.fromMe) {
      return NextResponse.json({ ok: true });
    }

    // Ignorar mensajes de grupos (JID de grupos termina en @g.us)
    if (msgData?.key?.remoteJid?.endsWith('@g.us')) {
      return NextResponse.json({ ok: true });
    }

    // Dedup: descartar mensajes ya procesados
    const messageId = msgData?.key?.id;
    cleanupProcessed();
    if (messageId && processedMessages.has(messageId)) {
      return NextResponse.json({ ok: true });
    }
    if (messageId) processedMessages.set(messageId, Date.now());

    // Extraer texto del mensaje (soporta texto plano y texto extendido)
    const text =
      msgData?.message?.conversation ||
      msgData?.message?.extendedTextMessage?.text;

    // Extraer número limpio (sin sufijo de WhatsApp)
    const phone = msgData?.key?.remoteJid
      ?.replace('@s.whatsapp.net', '')
      ?.replace('@c.us', '') ?? '';

    // Resolver negocio desde el instance name (formato: negocio_<id>)
    const negocioId = resolveNegocioFromInstance(body.instance);
    if (!negocioId) {
      return NextResponse.json({ ok: true });
    }

    // Si no es un mensaje de texto, pedir que escriban
    if (!text) {
      await sendWhatsApp({
        to: phone,
        text: 'Por favor, escribime tu consulta en texto para poder ayudarte 😊',
        instanceName: body.instance,
      });
      return NextResponse.json({ ok: true });
    }

    // Procesar mensaje con el bot y enviar respuesta
    const response = await handleWhatsAppMessage(negocioId, phone, text);
    await sendWhatsApp({
      to: phone,
      text: response,
      instanceName: body.instance,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[WHATSAPP-WEBHOOK] Error:', error);
    // Siempre 200 para que Evolution API no reintente el webhook
    return NextResponse.json({ ok: true });
  }
}
