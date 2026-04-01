// app/api/Whatsapp/webhook/route.ts
import { NextResponse } from 'next/server';
import { handleWhatsAppMessage, resolveNegocioFromInstance, verifyAccess } from '@/lib/whatsapp-bot';
import { sendWhatsApp } from '@/lib/notifications/channels/whatsapp';

const seen = new Set<string>();
function dup(id: string): boolean { if (seen.has(id)) return true; seen.add(id); setTimeout(() => seen.delete(id), 60000); return false; }

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const evt = (body.event || '').toLowerCase();
    if (evt !== 'messages.upsert') return NextResponse.json({ ok: true });

    const data = Array.isArray(body.data) ? body.data[0] : body.data;
    if (!data?.key) return NextResponse.json({ ok: true });
    if (data.key.fromMe) return NextResponse.json({ ok: true });
    const jid = data.key.remoteJid || '';
    if (jid.endsWith('@g.us')) return NextResponse.json({ ok: true });
    if (data.key.id && dup(data.key.id)) return NextResponse.json({ ok: true });

    const phone = jid.replace('@s.whatsapp.net', '');
    const instance = body.instance;
    const negocioId = resolveNegocioFromInstance(instance);
    if (!negocioId) return NextResponse.json({ ok: true });

    const { allowed } = await verifyAccess(negocioId);
    if (!allowed) {
      console.log(`[WEBHOOK] Bot desactivado para negocio ${negocioId}`);
      return NextResponse.json({ ok: true });
    }

    const text = data.message?.conversation || data.message?.extendedTextMessage?.text || null;
    if (!text) return NextResponse.json({ ok: true });

    console.log(`[WEBHOOK] ${phone} -> negocio ${negocioId}: "${text.substring(0, 50)}"`);
    const reply = await handleWhatsAppMessage(negocioId, phone, text, data.pushName);
    if (!reply) return NextResponse.json({ ok: true });

    await sendWhatsApp({ to: phone, text: reply, instanceName: instance });
    console.log(`[WEBHOOK] Respuesta enviada a ${phone}`);
    return NextResponse.json({ ok: true, replied: true });
  } catch (e: any) {
    console.error('[WEBHOOK] Error:', e?.message);
    return NextResponse.json({ ok: true });
  }
}

export async function GET() { return NextResponse.json({ status: 'active' }); }
