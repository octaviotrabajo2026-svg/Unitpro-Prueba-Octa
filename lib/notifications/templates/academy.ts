// lib/notifications/templates/academy.ts

import type { 
  AcademyNotificationEvent, 
  AcademyTemplateVars, 
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

const DEFAULT_TEMPLATES: Record<AcademyNotificationEvent, DefaultTemplate> = {
  
  // ═══ INSCRIPCIÓN → Estudiante ═══════════════════════════════════════════════
  inscripcion_estudiante: {
    emailSubject: '🎓 ¡Inscripción Exitosa! - {{curso}}',
    emailBody: `
      <p>Hola <strong>{{estudiante}}</strong>,</p>
      <p>¡Tu inscripción ha sido registrada con éxito!</p>
      <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>📚 Curso:</strong> {{curso}}</p>
        {{#precio}}<p style="margin: 0;"><strong>💰 Precio:</strong> {{precio}}</p>{{/precio}}
      </div>
      {{#precio}}
      <div style="background-color: #fef3c7; padding: 16px; border-radius: 8px; border: 1px solid #fcd34d; margin: 16px 0;">
        <p style="margin: 0; color: #92400e;">⚠️ <strong>Importante:</strong> El negocio se contactará contigo para coordinar el pago.</p>
      </div>
      {{/precio}}
      <p>¡Estamos emocionados de tenerte con nosotros!</p>
    `,
    whatsappBody: `¡Hola *{{estudiante}}*! 🎓

¡Tu inscripción ha sido registrada!

📚 *Curso:* {{curso}}
{{#precio}}💰 *Precio:* {{precio}}

⚠️ Nos contactaremos contigo para coordinar el pago.{{/precio}}

¡Bienvenido/a!`,
  },

  // ═══ INSCRIPCIÓN → Dueño ════════════════════════════════════════════════════
  inscripcion_dueño: {
    emailSubject: '🔔 Nueva Inscripción: {{estudiante}} - {{curso}}',
    emailBody: `
      <p>¡Tienes una nueva inscripción!</p>
      <div style="background-color: #eff6ff; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>👤 Estudiante:</strong> {{estudiante}}</p>
        <p style="margin: 0 0 8px 0;"><strong>📧 Email:</strong> {{email}}</p>
        <p style="margin: 0 0 8px 0;"><strong>📚 Curso:</strong> {{curso}}</p>
        {{#precio}}<p style="margin: 0;"><strong>💰 Precio:</strong> {{precio}}</p>{{/precio}}
      </div>
      {{#precio}}
      <p>Contacta al estudiante para coordinar el pago.</p>
      {{/precio}}
    `,
    whatsappBody: `🔔 *Nueva inscripción*

👤 *Estudiante:* {{estudiante}}
📧 *Email:* {{email}}
📚 *Curso:* {{curso}}
{{#precio}}💰 *Precio:* {{precio}}

Contactá al estudiante para coordinar el pago.{{/precio}}`,
  },

  // ═══ CURSO INICIA → Estudiante ══════════════════════════════════════════════
  curso_inicia: {
    emailSubject: '🚀 ¡Tu curso comienza! - {{curso}}',
    emailBody: `
      <p>Hola <strong>{{estudiante}}</strong>,</p>
      <p>¡Es momento de empezar tu aprendizaje!</p>
      <div style="background-color: #eff6ff; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>📚 Curso:</strong> {{curso}}</p>
        {{#fecha_inicio}}<p style="margin: 0;"><strong>📅 Fecha de inicio:</strong> {{fecha_inicio}}</p>{{/fecha_inicio}}
      </div>
      <p>¡Mucho éxito en tu aprendizaje!</p>
    `,
    whatsappBody: `¡Hola *{{estudiante}}*! 🚀

¡Tu curso está por comenzar!

📚 *Curso:* {{curso}}
{{#fecha_inicio}}📅 *Fecha de inicio:* {{fecha_inicio}}{{/fecha_inicio}}

¡Mucho éxito!`,
  },
};

// ─── Función para Compilar Templates ─────────────────────────────────────────

/**
 * Compila los templates de email y WhatsApp para un evento de Academy.
 */
export function compileAcademyTemplate(
  event: AcademyNotificationEvent,
  variables: AcademyTemplateVars,
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
 * Variables disponibles para templates de Academy.
 */
export function getAcademyTemplateVariables(event: AcademyNotificationEvent): string[] {
  const eventSpecificVars: Record<AcademyNotificationEvent, string[]> = {
    inscripcion_estudiante: ['estudiante', 'curso', 'precio'],
    inscripcion_dueño: ['estudiante', 'email', 'curso', 'precio'],
    curso_inicia: ['estudiante', 'curso', 'fecha_inicio'],
  };

  return eventSpecificVars[event] || [];
}