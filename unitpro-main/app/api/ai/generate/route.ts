import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase-server';
import {
  generateHeroText,
  generateServiceDescription,
  generateAboutText,
  generateCampaignMessage,
} from '@/lib/ai';

const VALID_ACTIONS = ['hero', 'service_description', 'about', 'campaign'] as const;

// Allowlists para parámetros opcionales (MEDIUM-2)
const VALID_TONES = ['formal', 'casual'] as const;
const VALID_CAMPAIGN_TYPES = ['reactivation', 'promotion', 'reminder'] as const;
const VALID_SEGMENTS = ['all', 'new', 'inactive', 'vip'] as const;

// Sanitización de strings para evitar prompt injection (HIGH-2)
const MAX_NAME_LEN = 100;
const MAX_SERVICE_LEN = 80;
const MAX_SERVICES_COUNT = 20;

function sanitizeText(s: unknown, maxLen: number): string {
  if (typeof s !== 'string') return '';
  return s.replace(/[^\p{L}\p{N}\s.,!?'"-]/gu, '').trim().slice(0, maxLen);
}

export async function POST(req: Request) {
  try {
    // Verificar que la API key de Anthropic esté configurada
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ success: false, error: 'Servicio no disponible.' }, { status: 500 });
    }

    // CRITICAL-1: Verificar sesión autenticada
    const supabaseUser = await createServerClient();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'No autorizado.' }, { status: 401 });
    }

    const { action, params, negocioId } = await req.json();

    // Validar action
    if (!VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ success: false, error: 'action inválida' }, { status: 400 });
    }

    // Validar negocioId
    if (typeof negocioId !== 'number' || !Number.isInteger(negocioId)) {
      return NextResponse.json({ success: false, error: 'negocioId inválido' }, { status: 400 });
    }

    // Cliente admin con service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // CRITICAL-1: Verificar que el negocio pertenece al usuario autenticado
    const { data: negocio, error: negocioError } = await supabaseAdmin
      .from('negocios')
      .select('id, nombre')
      .eq('id', negocioId)
      .eq('user_id', user.id)
      .single();

    if (negocioError || !negocio) {
      return NextResponse.json({ success: false, error: 'Acceso denegado.' }, { status: 403 });
    }

    // Verificar saldo — el UPDATE posterior usa optimistic lock (.eq('balance', currentBalance))
    // para prevenir la race condition TOCTOU en requests concurrentes.
    const { data: balanceRow } = await supabaseAdmin
      .from('unitcoins_balance')
      .select('balance, total_spent')
      .eq('negocio_id', negocioId)
      .maybeSingle();

    const currentBalance = balanceRow?.balance ?? 0;

    if (currentBalance < 1) {
      return NextResponse.json(
        { success: false, error: 'insufficient_balance', message: 'No tenés UnitCoins suficientes para usar la IA.' },
        { status: 402 }
      );
    }

    // HIGH-2: Sanitizar inputs antes de pasarlos a la IA
    const safeName = sanitizeText(params?.businessName ?? negocio.nombre, MAX_NAME_LEN) || negocio.nombre;
    const safeServices = (Array.isArray(params?.services) ? params.services : [])
      .slice(0, MAX_SERVICES_COUNT)
      .map((s: unknown) => sanitizeText(s, MAX_SERVICE_LEN))
      .filter(Boolean);
    const safeTone = VALID_TONES.includes(params?.tone) ? params.tone : 'casual';
    const safeCampaignType = VALID_CAMPAIGN_TYPES.includes(params?.campaignType) ? params.campaignType : 'reactivation';
    const safeSegment = VALID_SEGMENTS.includes(params?.clientSegment) ? params.clientSegment : 'all';
    const safeServiceName = sanitizeText(params?.serviceName, MAX_SERVICE_LEN);

    // Llamar a la función de IA correspondiente
    let result: any;
    try {
      if (action === 'hero') {
        result = await generateHeroText(safeName, safeServices);
      } else if (action === 'service_description') {
        result = await generateServiceDescription(safeServiceName || safeName, safeName);
      } else if (action === 'about') {
        result = await generateAboutText(safeName, safeTone);
      } else if (action === 'campaign') {
        result = await generateCampaignMessage(safeName, safeCampaignType, safeSegment);
      }
    } catch (aiError: any) {
      // MEDIUM-1: No exponer mensaje interno del SDK al cliente
      console.error('[ai/generate] Anthropic error:', aiError);
      return NextResponse.json({ success: false, error: 'ai_error' }, { status: 500 });
    }

    // Descontar 1 UC después de generación exitosa — optimistic lock via .eq('balance', currentBalance)
    const { data: deducted, error: deductErr } = await supabaseAdmin
      .from('unitcoins_balance')
      .update({
        balance: currentBalance - 1,
        total_spent: (balanceRow?.total_spent ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('negocio_id', negocioId)
      .eq('balance', currentBalance)
      .select('balance')
      .single();

    if (deductErr || !deducted) {
      return NextResponse.json({ error: 'Saldo insuficiente o conflicto. Intentá de nuevo.' }, { status: 402 });
    }

    await supabaseAdmin.from('unitcoins_transactions').insert({
      negocio_id: negocioId,
      type: 'ai_usage',
      amount: -1,
      description: `IA: ${action}`,
      metadata: { action },
    });

    return NextResponse.json({ success: true, result, newBalance: currentBalance - 1 });
  } catch (err: any) {
    console.error('[ai/generate] Error inesperado:', err);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
