// app/api/whatsapp/webhook/route.ts
// Webhook receptor de Evolution API para el chatbot de WhatsApp.
// Siempre responde 200 para que Evolution API no reintente.

import { NextRequest, NextResponse } from 'next/server';
import { handleWhatsAppMessage, resolveNegocioFromInstance } from '@/lib/whatsapp-bot';
import { sendWhatsApp } from '@/lib/notifications/channels/whatsapp';
import type { EvolutionWebhookPayload } from '@/types/whatsapp-bot';

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
  try {
    const body: EvolutionWebhookPayload = await request.json();

    // Solo procesar eventos de mensajes entrantes
    if (body.event !== 'messages.upsert') {
      return NextResponse.json({ ok: true });
    }

    const data = body.data;

    // Ignorar mensajes enviados por el bot mismo
    if (data.key.fromMe) {
      return NextResponse.json({ ok: true });
    }

    // Ignorar mensajes de grupos (JID de grupos termina en @g.us)
    if (data.key.remoteJid.endsWith('@g.us')) {
      return NextResponse.json({ ok: true });
    }

    // Dedup: descartar mensajes ya procesados
    const messageId = data.key.id;
    cleanupProcessed();
    if (processedMessages.has(messageId)) {
      return NextResponse.json({ ok: true });
    }
    processedMessages.set(messageId, Date.now());

    // Extraer texto del mensaje (soporta texto plano y texto extendido)
    const text =
      data.message?.conversation ||
      data.message?.extendedTextMessage?.text;

    // Extraer número limpio (sin sufijo de WhatsApp)
    const phone = data.key.remoteJid
      .replace('@s.whatsapp.net', '')
      .replace('@c.us', '');

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
