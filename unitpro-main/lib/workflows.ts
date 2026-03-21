// lib/workflows.ts
// SQL to run in Supabase (execute manually):
//
// CREATE TABLE IF NOT EXISTS automation_workflows (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   negocio_id integer REFERENCES negocios(id) ON DELETE CASCADE,
//   recipe_id text NOT NULL,
//   enabled boolean DEFAULT false,
//   config jsonb DEFAULT '{}',
//   executions integer DEFAULT 0,
//   last_run timestamptz,
//   created_at timestamptz DEFAULT now()
// );

export interface WorkflowRecipe {
  id: string;
  name: string;
  description: string;
  icon: string;
  trigger: string;
  defaultConfig: Record<string, any>;
  channel: 'whatsapp' | 'email' | 'both';
}

export interface WorkflowRow {
  id: string;
  negocio_id: number;
  recipe_id: string;
  enabled: boolean;
  config: Record<string, any>;
  executions: number;
  last_run: string | null;
  created_at: string;
}

export const WORKFLOW_RECIPES: WorkflowRecipe[] = [
  {
    id: 'reminder_24h',
    name: 'Recordatorio 24hs antes',
    description: 'Avisa al cliente el día anterior de su turno por WhatsApp.',
    icon: '⏰',
    trigger: 'turno_confirmado',
    defaultConfig: {
      delay: -24,
      delayUnit: 'hours',
      message: 'Hola {nombre}, te recordamos tu turno mañana a las {hora}. ¡Te esperamos!',
    },
    channel: 'whatsapp',
  },
  {
    id: 'post_visit_review',
    name: 'Pedir reseña post-visita',
    description: 'Solicita reseña automáticamente 2 horas después del turno.',
    icon: '⭐',
    trigger: 'turno_completado',
    defaultConfig: {
      delay: 2,
      delayUnit: 'hours',
      message: 'Hola {nombre}, ¿cómo te fue hoy? Nos encantaría leer tu opinión: {link_resena}',
    },
    channel: 'whatsapp',
  },
  {
    id: 'inactive_client',
    name: 'Cliente inactivo',
    description: 'Recupera clientes que no reservaron en los últimos 45 días.',
    icon: '💤',
    trigger: 'sin_turno_en_dias',
    defaultConfig: {
      diasSinTurno: 45,
      message: 'Hola {nombre}, hace un tiempo que no te vemos. ¡Te esperamos cuando quieras!',
    },
    channel: 'whatsapp',
  },
  {
    id: 'birthday_discount',
    name: 'Cumpleaños con descuento',
    description: 'Felicita al cliente en su cumpleaños con un descuento especial.',
    icon: '🎂',
    trigger: 'cumpleanos_cliente',
    defaultConfig: {
      message: '¡Feliz cumple {nombre}! 🎉 Tenés un descuento especial esperándote. ¡Reservá hoy!',
      discountPercent: 10,
    },
    channel: 'whatsapp',
  },
  {
    id: 'owner_notification',
    name: 'Notificación al dueño',
    description: 'Avisa al dueño del negocio cada vez que entra un nuevo turno.',
    icon: '🔔',
    trigger: 'turno_nuevo',
    defaultConfig: {
      delay: 0,
      message: 'Nuevo turno de {nombre} para el {fecha} a las {hora}.',
    },
    channel: 'whatsapp',
  },
];

// ─── Workflow execution helper ─────────────────────────────────────────────

/**
 * Substitute template variables in a workflow message.
 * Supports {nombre}, {fecha}, {hora}, {link_resena}, {negocio}.
 */
export function substituteTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

