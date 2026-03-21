import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const VALID_EVENT_TYPES = ['booking', 'contact', 'whatsapp_click', 'purchase'] as const;

// Simple in-memory rate limiting (resets on server restart)
const ipHits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await req.json();
    const { negocioId, type, path, referrer, userAgent, event_type, metadata } = body;

    if (typeof negocioId !== 'number' || !Number.isInteger(negocioId)) {
      return NextResponse.json({ error: 'negocioId inválido' }, { status: 400 });
    }
    if (type !== 'pageview' && type !== 'event') {
      return NextResponse.json({ error: 'type inválido' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (type === 'pageview') {
      await supabase.from('page_views').insert({
        negocio_id: negocioId,
        path: typeof path === 'string' ? path.slice(0, 500) : '/',
        referrer: typeof referrer === 'string' ? referrer.slice(0, 500) : null,
        user_agent: typeof userAgent === 'string' ? userAgent.slice(0, 300) : null,
      });
    } else {
      if (!VALID_EVENT_TYPES.includes(event_type)) {
        return NextResponse.json({ error: 'event_type inválido' }, { status: 400 });
      }
      await supabase.from('conversion_events').insert({
        negocio_id: negocioId,
        event_type,
        metadata: typeof metadata === 'object' && metadata !== null ? metadata : {},
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[track] Error:', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
