// app/api/superadmin/config/route.ts
// Permite al superadmin actualizar la tasa de UnitCoin y los precios de bloques.
// Usa la tabla `platform_config` (key TEXT PK, value JSONB, updated_at TIMESTAMPTZ).
//
// SQL para crear la tabla si no existe:
//   CREATE TABLE IF NOT EXISTS platform_config (
//     key        TEXT PRIMARY KEY,
//     value      JSONB NOT NULL,
//     updated_at TIMESTAMPTZ DEFAULT now()
//   );
//   INSERT INTO platform_config (key, value) VALUES
//     ('unitcoin_rate', '100'),
//     ('block_prices',  '{"calendar":25,"crm":15,"reviews":7,"gallery":8,"analytics":15,"marketing":10}')
//   ON CONFLICT (key) DO NOTHING;

import { NextResponse } from 'next/server';
import { cookies }      from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createHmac }   from 'crypto';

const SALT           = process.env.SUPERADMIN_SALT ?? 'unitpro_superadmin_salt_2026';
const SESSION_COOKIE = 'up_superadmin_session';

function deriveToken(password: string): string {
  return createHmac('sha256', SALT).update(password).digest('hex');
}

async function validateSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token       = cookieStore.get(SESSION_COOKIE)?.value;
  const validPass   = process.env.SUPERADMIN_PASSWORD || '';
  return !!token && token === deriveToken(validPass);
}

export async function POST(req: Request) {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const { key, value } = await req.json();
  if (!key || value === undefined) {
    return NextResponse.json({ error: 'Faltan parámetros: key y value.' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await supabase
    .from('platform_config')
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}