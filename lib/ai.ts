// lib/ai.ts
// SERVER-SIDE ONLY — do NOT import from client components.
// Uses @anthropic-ai/sdk with ANTHROPIC_API_KEY env var (server-side).

import Anthropic from '@anthropic-ai/sdk';

// Singleton — instantiated once per module lifecycle
const anthropic = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 800;

/**
 * Genera texto para la portada (hero) de una web de negocio.
 * Devuelve título, subtítulo y texto para el botón CTA.
 */
export async function generateHeroText(
  businessName: string,
  services: string[]
): Promise<{ titulo: string; subtitulo: string; cta: string }> {
  const systemPrompt =
    'Sos un copywriter experto en marketing para pequeños negocios de Latinoamérica. Escribís en español argentino, de forma cercana y profesional.';
  const prompt = `Generá un texto para la portada (hero) de la web de ${businessName}. Servicios que ofrece: ${services.join(', ') || 'servicios generales'}. Respondé SOLO con un objeto JSON válido sin markdown con estas claves: titulo (máx 8 palabras, impactante), subtitulo (1-2 oraciones descriptivas), cta (texto del botón de acción, máx 4 palabras).`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (response.content[0] as any).text as string;

    try {
      return JSON.parse(text);
    } catch {
      throw new Error('AI response was not valid JSON');
    }
  } catch (err: any) {
    throw new Error(`generateHeroText falló: ${err.message}`);
  }
}

/**
 * Genera una descripción breve (1-2 oraciones, máx 100 caracteres) para un servicio.
 */
export async function generateServiceDescription(
  serviceName: string,
  businessName: string
): Promise<string> {
  const prompt = `Escribí una descripción breve (1-2 oraciones, máx 100 caracteres) para el servicio '${serviceName}' del negocio '${businessName}'. Solo respondé con el texto, sin comillas ni explicaciones.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    });

    return (response.content[0] as any).text.trim() as string;
  } catch (err: any) {
    throw new Error(`generateServiceDescription falló: ${err.message}`);
  }
}

/**
 * Genera un texto de presentación del negocio (sección "Sobre nosotros").
 * El tono puede ser 'formal' o 'casual'.
 */
export async function generateAboutText(
  businessName: string,
  tone: string
): Promise<string> {
  const toneDesc =
    tone === 'formal'
      ? 'formal y profesional'
      : 'cercano, amigable y casual';
  const prompt = `Escribí un texto de presentación en 2-3 oraciones para la sección "Sobre nosotros" del negocio "${businessName}". Usá un tono ${toneDesc}. Solo respondé con el texto, sin comillas ni explicaciones.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    });

    return (response.content[0] as any).text.trim() as string;
  } catch (err: any) {
    throw new Error(`generateAboutText falló: ${err.message}`);
  }
}

/**
 * Genera contenido para una campaña de marketing multi-canal.
 * Devuelve mensaje de WhatsApp, asunto de email y cuerpo del email.
 */
export async function generateCampaignMessage(
  businessName: string,
  campaignType: string,
  clientSegment: string
): Promise<{ whatsapp: string; email_subject: string; email_body: string }> {
  const systemPrompt =
    'Sos un copywriter experto en marketing para pequeños negocios de Latinoamérica. Escribís en español argentino, de forma cercana y profesional.';
  const prompt = `Generá contenido para una campaña de tipo "${campaignType}" del negocio "${businessName}" dirigida al segmento "${clientSegment}". Respondé SOLO con un objeto JSON válido sin markdown con estas claves: whatsapp (mensaje corto para WhatsApp, máx 160 caracteres), email_subject (asunto del email, máx 10 palabras), email_body (cuerpo del email en 2-3 párrafos cortos).`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (response.content[0] as any).text as string;

    try {
      return JSON.parse(text);
    } catch {
      throw new Error('AI response was not valid JSON');
    }
  } catch (err: any) {
    throw new Error(`generateCampaignMessage falló: ${err.message}`);
  }
}
