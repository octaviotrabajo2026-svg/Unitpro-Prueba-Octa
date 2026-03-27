// lib/notifications/templates/shop.ts

import type { 
  ShopNotificationEvent, 
  ShopTemplateVars, 
  CompiledTemplate,
  NotificationConfig 
} from '../types';
import { wrapEmailHtml } from '../channels/email';

// ─── Templates por Defecto ───────────────────────────────────────────────────

interface DefaultTemplate {
  emailSubject: string;
  emailBody: string;
  whatsappBody: string;
}

const DEFAULT_TEMPLATES: Record<ShopNotificationEvent, DefaultTemplate> = {
  
  // ═══ ORDEN RECIBIDA → Cliente ═══════════════════════════════════════════════
  orden_recibida_cliente: {
    emailSubject: '🛍️ Pedido Recibido - #{{orden_id}}',
    emailBody: `
      <p>Hola <strong>{{cliente}}</strong>,</p>
      <p>¡Recibimos tu pedido!</p>
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>🧾 Pedido:</strong> #{{orden_id}}</p>
        <p style="margin: 0 0 8px 0;"><strong>💰 Total:</strong> {{total}}</p>
        {{#items}}<p style="margin: 0; font-size: 13px; color: #6b7280;">{{items}}</p>{{/items}}
      </div>
      <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border: 1px solid #fcd34d; margin: 16px 0;">
        <p style="margin: 0; color: #92400e;">⏳ <strong>Estado:</strong> Pendiente de pago</p>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #92400e;">Te contactaremos para coordinar el pago y envío.</p>
      </div>
      <p>¡Gracias por tu compra!</p>
    `,
    whatsappBody: `¡Hola *{{cliente}}*! 🛍️

¡Recibimos tu pedido!

🧾 *Pedido:* #{{orden_id}}
💰 *Total:* {{total}}
{{#items}}📦 {{items}}{{/items}}

⏳ *Estado:* Pendiente de pago
Te contactaremos para coordinar el pago y envío.

¡Gracias por tu compra!`,
  },

  // ═══ ORDEN RECIBIDA → Dueño ═════════════════════════════════════════════════
  orden_recibida_dueño: {
    emailSubject: '🔔 Nueva Venta - #{{orden_id}} - {{total}}',
    emailBody: `
      <p>¡Tienes una nueva venta!</p>
      <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>👤 Cliente:</strong> {{cliente}}</p>
        <p style="margin: 0 0 8px 0;"><strong>🧾 Pedido:</strong> #{{orden_id}}</p>
        <p style="margin: 0 0 8px 0; font-size: 20px;"><strong>💰 Total:</strong> {{total}}</p>
        {{#items}}<p style="margin: 0; font-size: 13px; color: #6b7280;">{{items}}</p>{{/items}}
      </div>
      <p>Ingresa al panel para gestionar el pedido.</p>
    `,
    whatsappBody: `🔔 *¡Nueva venta!*

👤 *Cliente:* {{cliente}}
🧾 *Pedido:* #{{orden_id}}
💰 *Total:* {{total}}
{{#items}}📦 {{items}}{{/items}}

Ingresa al panel para gestionar el pedido.`,
  },

  // ═══ ORDEN PAGADA → Cliente ═════════════════════════════════════════════════
  orden_pagada: {
    emailSubject: '✅ Pago Confirmado - Pedido #{{orden_id}}',
    emailBody: `
      <p>Hola <strong>{{cliente}}</strong>,</p>
      <p>¡Tu pago ha sido confirmado!</p>
      <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>🧾 Pedido:</strong> #{{orden_id}}</p>
        <p style="margin: 0 0 8px 0;"><strong>💰 Total:</strong> {{total}}</p>
        <p style="margin: 0;"><strong>✅ Estado:</strong> Pagado</p>
      </div>
      <p>Estamos preparando tu pedido. Te avisaremos cuando esté en camino.</p>
      <p>¡Gracias por tu compra!</p>
    `,
    whatsappBody: `¡Hola *{{cliente}}*! ✅

¡Tu pago ha sido confirmado!

🧾 *Pedido:* #{{orden_id}}
💰 *Total:* {{total}}

Estamos preparando tu pedido. Te avisaremos cuando esté en camino.

¡Gracias por tu compra!`,
  },

  // ═══ ORDEN ENVIADA/COMPLETADA → Cliente ═════════════════════════════════════
  orden_enviada: {
    emailSubject: '🚚 ¡Tu pedido está en camino! - #{{orden_id}}',
    emailBody: `
      <p>Hola <strong>{{cliente}}</strong>,</p>
      <p>¡Excelentes noticias! Tu pedido está en camino.</p>
      <div style="background-color: #eff6ff; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>🧾 Pedido:</strong> #{{orden_id}}</p>
        <p style="margin: 0;"><strong>🚚 Estado:</strong> Enviado / En camino</p>
      </div>
      {{#tracking}}
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 16px 0;">
        <p style="margin: 0;"><strong>📍 Seguimiento:</strong> {{tracking}}</p>
      </div>
      {{/tracking}}
      <p>¡Gracias por tu compra!</p>
    `,
    whatsappBody: `¡Hola *{{cliente}}*! 🚚

¡Tu pedido está en camino!

🧾 *Pedido:* #{{orden_id}}
📦 *Estado:* Enviado
{{#tracking}}📍 *Seguimiento:* {{tracking}}{{/tracking}}

¡Gracias por tu compra!`,
  },
};

// ─── Función para Compilar Templates ─────────────────────────────────────────

/**
 * Compila los templates de email y WhatsApp para un evento de Shop.
 */
export function compileShopTemplate(
  event: ShopNotificationEvent,
  variables: ShopTemplateVars,
  customConfig?: NotificationConfig
): CompiledTemplate {
  const defaults = DEFAULT_TEMPLATES[event];
  if (!defaults) {
    console.warn(`[TEMPLATE] No existe template para evento: ${event}`);
    return {};
  }

  // Seleccionar templates (custom o default)
  const emailSubject = customConfig?.emailSubject || defaults.emailSubject;
  const emailBody = customConfig?.emailBody || defaults.emailBody;
  const whatsappBody = customConfig?.whatsappBody || defaults.whatsappBody;
  const bannerUrl = customConfig?.bannerUrl;

  // Reemplazar variables
  const replaceVars = (text: string): string => {
    let result = text;
    
    // Variables simples
    Object.entries(variables).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, String(value));
      }
    });

    // Condicionales simples
    Object.entries(variables).forEach(([key, value]) => {
      const conditionalRegex = new RegExp(`{{#${key}}}([\\s\\S]*?){{/${key}}}`, 'g');
      if (value && String(value).trim()) {
        result = result.replace(conditionalRegex, (_, content) => {
          return content.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        });
      } else {
        result = result.replace(conditionalRegex, '');
      }
    });

    // Limpiar variables no reemplazadas
    result = result.replace(/{{#?\w+}}/g, '');
    result = result.replace(/{{\/?}}/g, '');

    return result.trim();
  };

  const compiledEmailSubject = replaceVars(emailSubject);
  const compiledEmailBody = replaceVars(emailBody);
  const compiledWhatsappBody = replaceVars(whatsappBody);

  return {
    email: {
      subject: compiledEmailSubject,
      html: wrapEmailHtml(compiledEmailBody, bannerUrl),
    },
    whatsapp: {
      text: compiledWhatsappBody,
      imageUrl: bannerUrl,
    },
  };
}

/**
 * Variables disponibles para templates de Shop.
 */
export function getShopTemplateVariables(event: ShopNotificationEvent): string[] {
  const eventSpecificVars: Record<ShopNotificationEvent, string[]> = {
    orden_recibida_cliente: ['cliente', 'orden_id', 'total', 'items'],
    orden_recibida_dueño: ['cliente', 'orden_id', 'total', 'items'],
    orden_pagada: ['cliente', 'orden_id', 'total'],
    orden_enviada: ['cliente', 'orden_id', 'tracking'],
  };

  return eventSpecificVars[event] || [];
}