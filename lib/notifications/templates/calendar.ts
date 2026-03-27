// lib/notifications/templates/calendar.ts

import type { 
  CalendarNotificationEvent, 
  CalendarTemplateVars, 
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

const DEFAULT_TEMPLATES: Record<CalendarNotificationEvent, DefaultTemplate> = {
  
  // ═══ TURNO CREADO (auto-confirmado) → Cliente ═══════════════════════════════
  turno_creado_cliente: {
    emailSubject: '✅ Turno Confirmado: {{servicio}}',
    emailBody: `
      <p>Hola <strong>{{cliente}}</strong>,</p>
      <p>Tu turno ha sido confirmado exitosamente:</p>
      <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>📋 Servicio:</strong> {{servicio}}</p>
        <p style="margin: 0 0 8px 0;"><strong>📅 Fecha:</strong> {{fecha}}</p>
        <p style="margin: 0 0 8px 0;"><strong>⏰ Hora:</strong> {{hora}}</p>
        {{#profesional}}<p style="margin: 0;"><strong>👤 Profesional:</strong> {{profesional}}</p>{{/profesional}}
      </div>
      <p>¡Te esperamos!</p>
    `,
    whatsappBody: `¡Hola *{{cliente}}*! ✅

Tu turno ha sido confirmado:

📋 *Servicio:* {{servicio}}
📅 *Fecha:* {{fecha}}
⏰ *Hora:* {{hora}}
{{#profesional}}👤 *Profesional:* {{profesional}}{{/profesional}}

¡Te esperamos!`,
  },

  // ═══ TURNO PENDIENTE → Dueño/Profesional ════════════════════════════════════
  turno_pendiente_dueño: {
    emailSubject: '🔔 Nueva Solicitud de Turno: {{cliente}}',
    emailBody: `
      <p>Hola,</p>
      <p>Tienes una nueva solicitud de turno pendiente de aprobación:</p>
      <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>👤 Cliente:</strong> {{cliente}}</p>
        <p style="margin: 0 0 8px 0;"><strong>📞 Teléfono:</strong> {{telefono}}</p>
        <p style="margin: 0 0 8px 0;"><strong>📋 Servicio:</strong> {{servicio}}</p>
        <p style="margin: 0 0 8px 0;"><strong>📅 Fecha:</strong> {{fecha}}</p>
        <p style="margin: 0;"><strong>⏰ Hora:</strong> {{hora}}</p>
      </div>
      <p>Ingresa al panel de administración para aprobar o rechazar esta solicitud.</p>
    `,
    whatsappBody: `🔔 *Nueva solicitud de turno*

👤 *Cliente:* {{cliente}}
📞 *Teléfono:* {{telefono}}
📋 *Servicio:* {{servicio}}
📅 *Fecha:* {{fecha}}
⏰ *Hora:* {{hora}}

Ingresa al panel para aprobar o rechazar.`,
  },

  // ═══ SEÑA REQUERIDA → Cliente ═══════════════════════════════════════════════
  seña_requerida: {
    emailSubject: '📢 Seña Requerida - {{servicio}}',
    emailBody: `
      <p>Hola <strong>{{cliente}}</strong>,</p>
      <p>Tu solicitud para <strong>{{servicio}}</strong> ha sido pre-aprobada.</p>
      <div style="background-color: #fff7ed; padding: 16px; border-radius: 8px; border: 1px solid #fdba74; margin: 16px 0;">
        <p style="margin: 0 0 4px 0; color: #9a3412;">⚠️ <strong>El horario NO está reservado aún.</strong></p>
        <p style="margin: 0; font-size: 13px; color: #c2410c;">Se confirmará al recibir la seña.</p>
      </div>
      <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>💰 Total del Servicio:</strong> {{precio_total}}</p>
        <p style="margin: 0; font-size: 18px; color: #c2410c;"><strong>💵 Monto a Señar:</strong> {{monto_senia}}</p>
      </div>
      {{#alias}}
      <div style="background-color: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>🏦 Datos para transferencia:</strong></p>
        <p style="margin: 0; font-family: monospace; font-size: 14px;">Alias: <strong>{{alias}}</strong></p>
      </div>
      <p>Por favor, envía el comprobante de pago respondiendo a este correo o por WhatsApp.</p>
      {{/alias}}
    `,
    whatsappBody: `¡Hola *{{cliente}}*! 👋

Tu solicitud para *{{servicio}}* ha sido pre-aprobada.

⚠️ *El horario NO está reservado aún.* Se confirmará al recibir la seña.

💰 *Total:* {{precio_total}}
💵 *Seña a abonar:* {{monto_senia}}

{{#alias}}🏦 *Datos para transferencia:*
Alias: {{alias}}

Envianos el comprobante por este medio. ¡Gracias!{{/alias}}`,
  },

  // ═══ TURNO CONFIRMADO → Cliente ═════════════════════════════════════════════
  turno_confirmado: {
    emailSubject: '✅ Turno Confirmado: {{servicio}}',
    emailBody: `
      <p>Hola <strong>{{cliente}}</strong>,</p>
      <p>Tu turno ha sido <strong style="color: #16a34a;">CONFIRMADO</strong>:</p>
      <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>📋 Servicio:</strong> {{servicio}}</p>
        <p style="margin: 0 0 8px 0;"><strong>📅 Fecha:</strong> {{fecha}}</p>
        <p style="margin: 0 0 8px 0;"><strong>⏰ Hora:</strong> {{hora}}</p>
        {{#profesional}}<p style="margin: 0;"><strong>👤 Profesional:</strong> {{profesional}}</p>{{/profesional}}
      </div>
      {{#precio_a_pagar}}
      <p style="margin-top: 16px;">💵 <strong>Saldo a abonar en el lugar:</strong> {{precio_a_pagar}}</p>
      {{/precio_a_pagar}}
      <p>¡Te esperamos!</p>
    `,
    whatsappBody: `¡Hola *{{cliente}}*! ✅

Tu turno ha sido *CONFIRMADO*:

📋 *Servicio:* {{servicio}}
📅 *Fecha:* {{fecha}}
⏰ *Hora:* {{hora}}
{{#profesional}}👤 *Profesional:* {{profesional}}{{/profesional}}

{{#precio_a_pagar}}💵 *Saldo a abonar:* {{precio_a_pagar}}{{/precio_a_pagar}}

¡Te esperamos!`,
  },

  // ═══ TURNO CONFIRMADO → Dueño/Profesional ═══════════════════════════════════
  turno_confirmado_dueño: {
    emailSubject: '✅ Turno Confirmado: {{cliente}} - {{servicio}}',
    emailBody: `
      <p>Se ha confirmado un turno:</p>
      <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>👤 Cliente:</strong> {{cliente}}</p>
        <p style="margin: 0 0 8px 0;"><strong>📞 Teléfono:</strong> {{telefono}}</p>
        <p style="margin: 0 0 8px 0;"><strong>📋 Servicio:</strong> {{servicio}}</p>
        <p style="margin: 0 0 8px 0;"><strong>📅 Fecha:</strong> {{fecha}}</p>
        <p style="margin: 0;"><strong>⏰ Hora:</strong> {{hora}}</p>
      </div>
    `,
    whatsappBody: `✅ *Turno confirmado*

👤 *Cliente:* {{cliente}}
📞 *Teléfono:* {{telefono}}
📋 *Servicio:* {{servicio}}
📅 *Fecha:* {{fecha}}
⏰ *Hora:* {{hora}}`,
  },

  // ═══ TURNO CANCELADO → Cliente ══════════════════════════════════════════════
  turno_cancelado: {
    emailSubject: '❌ Turno Cancelado: {{servicio}}',
    emailBody: `
      <p>Hola <strong>{{cliente}}</strong>,</p>
      <p>Tu turno ha sido <strong style="color: #dc2626;">cancelado</strong>:</p>
      <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>📋 Servicio:</strong> {{servicio}}</p>
        <p style="margin: 0 0 8px 0;"><strong>📅 Fecha:</strong> {{fecha}}</p>
        <p style="margin: 0;"><strong>⏰ Hora:</strong> {{hora}}</p>
      </div>
      <p>Si tienes alguna consulta, no dudes en contactarnos.</p>
    `,
    whatsappBody: `¡Hola *{{cliente}}*! ❌

Tu turno ha sido cancelado:

📋 *Servicio:* {{servicio}}
📅 *Fecha:* {{fecha}}
⏰ *Hora:* {{hora}}

Si deseas reprogramar, contáctanos. ¡Saludos!`,
  },

  // ═══ TURNO REAGENDADO → Cliente ═════════════════════════════════════════════
  turno_reagendado: {
    emailSubject: '📅 Turno Reagendado: {{servicio}}',
    emailBody: `
      <p>Hola <strong>{{cliente}}</strong>,</p>
      <p>Tu turno ha sido <strong>reagendado</strong>:</p>
      <div style="background-color: #eff6ff; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>📋 Servicio:</strong> {{servicio}}</p>
        <p style="margin: 0 0 8px 0;"><strong>📅 Nueva Fecha:</strong> {{fecha}}</p>
        <p style="margin: 0;"><strong>⏰ Nueva Hora:</strong> {{hora}}</p>
      </div>
      <p>¡Te esperamos!</p>
    `,
    whatsappBody: `¡Hola *{{cliente}}*! 📅

Tu turno ha sido reagendado:

📋 *Servicio:* {{servicio}}
📅 *Nueva Fecha:* {{fecha}}
⏰ *Nueva Hora:* {{hora}}

¡Te esperamos!`,
  },

  // ═══ RECORDATORIO → Cliente ═════════════════════════════════════════════════
  recordatorio: {
    emailSubject: '⏰ Recordatorio: Turno {{tiempo_restante}}',
    emailBody: `
      <p>Hola <strong>{{cliente}}</strong>,</p>
      <p>Te recordamos que tienes un turno próximo:</p>
      <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>📋 Servicio:</strong> {{servicio}}</p>
        <p style="margin: 0 0 8px 0;"><strong>📅 Fecha:</strong> {{fecha}}</p>
        <p style="margin: 0 0 8px 0;"><strong>⏰ Hora:</strong> {{hora}}</p>
        {{#profesional}}<p style="margin: 0;"><strong>👤 Profesional:</strong> {{profesional}}</p>{{/profesional}}
      </div>
      <p>Si no puedes asistir, por favor avísanos con anticipación.</p>
      <p>¡Te esperamos!</p>
    `,
    whatsappBody: `¡Hola *{{cliente}}*! ⏰

Te recordamos tu turno:

📋 *Servicio:* {{servicio}}
📅 *Fecha:* {{fecha}}
⏰ *Hora:* {{hora}}
{{#profesional}}👤 *Profesional:* {{profesional}}{{/profesional}}

Si no podés asistir, avisanos con anticipación. ¡Te esperamos!`,
  },
};

// ─── Función para Compilar Templates ─────────────────────────────────────────

/**
 * Compila los templates de email y WhatsApp para un evento de Calendar.
 * Usa los templates del config del negocio si existen, sino usa los defaults.
 */
export function compileCalendarTemplate(
  event: CalendarNotificationEvent,
  variables: CalendarTemplateVars,
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

    // Condicionales simples: {{#variable}}contenido{{/variable}}
    // Solo muestra el contenido si la variable existe y no está vacía
    Object.entries(variables).forEach(([key, value]) => {
      const conditionalRegex = new RegExp(`{{#${key}}}([\\s\\S]*?){{/${key}}}`, 'g');
      if (value && String(value).trim()) {
        // Tiene valor: mostrar contenido y reemplazar variable dentro
        result = result.replace(conditionalRegex, (_, content) => {
          return content.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        });
      } else {
        // Sin valor: eliminar bloque completo
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
 * Obtiene la lista de variables disponibles para un evento.
 * Útil para mostrar en el editor de templates.
 */
export function getCalendarTemplateVariables(event: CalendarNotificationEvent): string[] {
  const commonVars = ['cliente', 'servicio', 'fecha', 'hora', 'profesional'];
  
  const eventSpecificVars: Record<CalendarNotificationEvent, string[]> = {
    turno_creado_cliente: commonVars,
    turno_pendiente_dueño: [...commonVars, 'telefono'],
    seña_requerida: [...commonVars, 'precio_total', 'monto_senia', 'alias'],
    turno_confirmado: [...commonVars, 'precio_a_pagar'],
    turno_confirmado_dueño: [...commonVars, 'telefono'],
    turno_cancelado: commonVars,
    turno_reagendado: commonVars,
    recordatorio: [...commonVars, 'tiempo_restante'],
  };

  return eventSpecificVars[event] || commonVars;
}