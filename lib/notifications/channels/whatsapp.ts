// lib/notifications/channels/whatsapp.ts

export interface SendWhatsAppParams {
  to: string;
  text: string;
  instanceName: string;
  imageUrl?: string;
}

export interface SendWhatsAppResult {
  sent: boolean;
  error?: string;
}

/**
 * Envía un mensaje de WhatsApp usando la Evolution API.
 * Requiere que el negocio tenga configurada una instancia de Evolution.
 */
export async function sendWhatsApp({
  to,
  text,
  instanceName,
  imageUrl,
}: SendWhatsAppParams): Promise<SendWhatsAppResult> {
  
  if (!instanceName) {
    return { sent: false, error: 'No hay instancia de WhatsApp configurada' };
  }

  if (!to) {
    return { sent: false, error: 'No hay número de teléfono' };
  }

  // Limpiar número: solo dígitos
  const cleanNumber = to.replace(/\D/g, '');

  if (!cleanNumber || cleanNumber.length < 8) {
    return { sent: false, error: 'Número de teléfono inválido' };
  }

  try {
    const apiUrl = process.env.EVOLUTION_API_URL?.replace(/\/$/, '');
    const apiKey = process.env.EVOLUTION_API_KEY;

    if (!apiUrl || !apiKey) {
      return { sent: false, error: 'Evolution API no configurada en variables de entorno' };
    }

    // Determinar endpoint y estructura según si hay imagen
    const endpoint = imageUrl ? 'sendMedia' : 'sendText';
    
    const requestBody = imageUrl 
      ? {
          number: cleanNumber,
          media: imageUrl,
          mediatype: 'image',
          caption: text,  // El texto va como pie de foto
          delay: 1500,
        }
      : {
          number: cleanNumber,
          text: text,
          delay: 1500,
        };

    const response = await fetch(`${apiUrl}/message/${endpoint}/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    console.log(`✅ [WHATSAPP ENVIADO] a ${cleanNumber}${imageUrl ? ' (con imagen)' : ''}`);
    return { sent: true };

  } catch (error: any) {
    console.error('❌ [ERROR WHATSAPP]:', error?.message || error);
    return { 
      sent: false, 
      error: error?.message || 'Error desconocido al enviar WhatsApp' 
    };
  }
}

/**
 * Formatea texto para WhatsApp con formato enriquecido.
 * Convierte marcadores simples a formato de WhatsApp.
 * 
 * Formato WhatsApp:
 * - *texto* = negrita
 * - _texto_ = cursiva
 * - ~texto~ = tachado
 * - ```texto``` = monospace
 */
export function formatWhatsAppText(text: string): string {
  return text
    // Asegurar que los saltos de línea sean consistentes
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Limpiar espacios múltiples pero preservar saltos de línea
    .replace(/[ \t]+/g, ' ')
    .trim();
}