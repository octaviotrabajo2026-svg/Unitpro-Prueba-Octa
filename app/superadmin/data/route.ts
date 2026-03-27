// app/api/superadmin/data/route.ts

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

export async function GET() {
  if (!(await validateSession())) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // ── Agencias con conteo de negocios ──────────────────────────────────────
  const { data: agencies, error } = await supabase
    .from('agencies')
    .select('id, nombre_agencia, email, slug, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const agenciesWithCount = await Promise.all(
    (agencies || []).map(async (agency) => {
      const { count } = await supabase
        .from('negocios')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agency.id);
      return { ...agency, client_count: count ?? 0 };
    })
  );

  // ── Negocios autogestionados (sin agencia) ────────────────────────────────
  const { data: selfManaged } = await supabase
    .from('negocios')
    .select('id, nombre, slug, email, created_at, estado_plan')
    .is('agency_id', null)
    .order('created_at', { ascending: false })
    .limit(200);

  // ── Platform config (precios + billing_enforced) ──────────────────────────
  const { data: configRows } = await supabase
    .from('platform_config')
    .select('key, value');

  const platformConfig: Record<string, any> = {};
  (configRows || []).forEach((row: any) => {
    platformConfig[row.key] = row.value;
  });

  const billingEnforced: { negocio_ids: number[]; agency_ids: number[] } =
    platformConfig['billing_enforced'] ?? { negocio_ids: [], agency_ids: [] };

  return NextResponse.json({
    agencies:        agenciesWithCount,
    selfManaged:     selfManaged     || [],
    platformConfig,
    billingEnforced,
    totalAgencies:   agenciesWithCount.length,
    totalClients:    agenciesWithCount.reduce((a, ag) => a + ag.client_count, 0),
  });
}