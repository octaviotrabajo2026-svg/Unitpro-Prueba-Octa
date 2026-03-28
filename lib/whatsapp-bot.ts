'use server';

// lib/whatsapp-bot.ts
// Motor del chatbot de WhatsApp. Usa Claude con tool use para agendar turnos,
// consultar disponibilidad y cancelar citas en nombre del negocio.

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { checkAvailability, createAppointment, type CreateAppointmentPayload } from '@/blocks/calendar/actions';
import { generateTimeSlots } from '@/lib/time-slots';
import { sendWhatsApp } from '@/lib/notifications/channels/whatsapp';
import type { WhatsappConversation, ConversationMessage } from '@/types/whatsapp-bot';

// Re-exportar sendWhatsApp para que el webhook lo pueda importar junto con este módulo
export { sendWhatsApp };

const anthropic = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 600;
const MAX_ITERATIONS = 5;
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 horas
const MAX_MESSAGES = 20;

/** Crea un cliente Supabase con service role para operaciones del servidor. */
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Extrae el negocio_id desde el instance name de Evolution API.
 * Formato esperado: negocio_[id]
 */
export function resolveNegocioFromInstance(instanceName: string): string | null {
  const match = instanceName.match(/^negocio_(.+)$/);
  return match ? match[1] : null;
}

/**
 * Verifica que el bloque chatbot esté activo para el negocio y
 * que el chatbot esté habilitado en config_web.
 */
async function verifyAccess(
  negocioId: string
): Promise<{ allowed: boolean; configWeb?: any; negocio?: any }> {
  const supabase = getSupabaseAdmin();

  const { data: block } = await supabase
    .from('tenant_blocks')
    .select('active')
    .eq('negocio_id', negocioId)
    .eq('block_id', 'chatbot')
    .single();

  if (!block?.active) return { allowed: false };

  const { data: negocio } = await supabase
    .from('negocios')
    .select('*, config_web')
    .eq('id', negocioId)
    .single();

  if (!negocio) return { allowed: false };

  const configWeb = negocio.config_web || {};
  if (!configWeb.chatbot?.enabled) return { allowed: false };

  return { allowed: true, configWeb, negocio };
}

/**
 * Obtiene una conversación activa existente (dentro de la ventana de 2hs)
 * o crea una nueva.
 */
async function getOrCreateConversation(
  negocioId: string,
  phone: string
): Promise<WhatsappConversation> {
  const supabase = getSupabaseAdmin();
  const cutoff = new Date(Date.now() - SESSION_DURATION_MS).toISOString();

  const { data: existing } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('negocio_id', negocioId)
    .eq('phone', phone)
    .gte('last_activity', cutoff)
    .order('last_activity', { ascending: false })
    .limit(1)
    .single();

  if (existing) return existing as WhatsappConversation;

  const { data: created } = await supabase
    .from('whatsapp_conversations')
    .insert({
      negocio_id: negocioId,
      phone,
      messages: [],
      booking_draft: {},
      stage: 'greeting',
      last_activity: new Date().toISOString(),
    })
    .select()
    .single();

  return created as WhatsappConversation;
}

/**
 * Persiste los cambios de una conversación en Supabase.
 * Limita el historial a MAX_MESSAGES para no crecer indefinidamente.
 */
async function updateConversation(
  id: string,
  updates: Partial<WhatsappConversation>
) {
  const supabase = getSupabaseAdmin();

  if (updates.messages && updates.messages.length > MAX_MESSAGES) {
    updates.messages = updates.messages.slice(-MAX_MESSAGES);
  }

  await supabase
    .from('whatsapp_conversations')
    .update({ ...updates, last_activity: new Date().toISOString() })
    .eq('id', id);
}

/**
 * Construye el system prompt dinámico con la info real del negocio.
 * El schedule usa claves numéricas (WeeklySchedule de web-config.ts).
 */
function buildSystemPrompt(configWeb: any, negocio: any): string {
  const now = new Date().toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  const servicios = configWeb.servicios?.items || [];
  const equipo = configWeb.equipo?.items || [];

  const serviciosText =
    servicios
      .map((s: any) => `- ${s.titulo}: $${s.precio}, ${s.duracion} min`)
      .join('\n') || 'No hay servicios configurados';

  const equipoText =
    equipo
      .map((e: any) => `- ${e.nombre}${e.cargo ? ` (${e.cargo})` : ''}`)
      .join('\n') || 'No hay equipo configurado';

  // WeeklySchedule usa keys "0"..="6" (0=domingo) con isOpen + ranges
  const schedule = configWeb.schedule || configWeb.calendar?.schedule || {};
  const dayNames: Record<string, string> = {
    '1': 'lunes', '2': 'martes', '3': 'miercoles',
    '4': 'jueves', '5': 'viernes', '6': 'sabado', '0': 'domingo',
  };
  const horarioText =
    Object.entries(dayNames)
      .filter(([key]) => schedule[key]?.isOpen)
      .map(([key, name]) => {
        const ranges = schedule[key].ranges
          ?.map((r: any) => `${r.start}-${r.end}`)
          .join(', ');
        return `${name}: ${ranges || 'horario a confirmar'}`;
      })
      .join('\n') || 'Consultar disponibilidad';

  return `Sos el asistente virtual de ${negocio.nombre || 'este negocio'} en WhatsApp. Ayudás a agendar turnos, consultar disponibilidad y cancelar citas.

Fecha y hora actual: ${now} (America/Argentina/Buenos_Aires)

SERVICIOS DISPONIBLES:
${serviciosText}

EQUIPO:
${equipoText}

HORARIOS:
${horarioText}

REGLAS:
- Hablá en español argentino, de forma amable y cercana
- Usá emojis moderados (1-2 por mensaje)
- Siempre usá las tools disponibles para obtener datos reales, no inventes información
- Pedí el nombre completo y email para confirmar un turno
- Si el usuario quiere cancelar, pedí el teléfono para buscar el turno
- Confirmá siempre los detalles antes de crear un turno
- Si no hay disponibilidad, ofrecé otros horarios o fechas
- Respondé de forma concisa (máx 3-4 oraciones por mensaje)`;
}

// ─── Definición de las 6 tools para Claude ───────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'listar_servicios',
    description: 'Lista los servicios disponibles del negocio con nombre, precio y duración',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'listar_profesionales',
    description: 'Lista los profesionales disponibles para un servicio específico',
    input_schema: {
      type: 'object' as const,
      properties: {
        servicio_nombre: { type: 'string', description: 'Nombre del servicio' },
      },
      required: ['servicio_nombre'],
    },
  },
  {
    name: 'consultar_disponibilidad',
    description:
      'Consulta los horarios disponibles para una fecha, servicio y profesional específicos',
    input_schema: {
      type: 'object' as const,
      properties: {
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        servicio_nombre: { type: 'string', description: 'Nombre del servicio' },
        worker_id: { type: 'string', description: 'ID del profesional (opcional)' },
      },
      required: ['fecha', 'servicio_nombre'],
    },
  },
  {
    name: 'crear_turno',
    description: 'Crea un turno/reserva con todos los datos del cliente',
    input_schema: {
      type: 'object' as const,
      properties: {
        servicio_nombre: { type: 'string' },
        fecha: { type: 'string', description: 'YYYY-MM-DD' },
        hora: { type: 'string', description: 'HH:mm' },
        cliente_nombre: { type: 'string' },
        cliente_apellido: { type: 'string' },
        cliente_telefono: { type: 'string' },
        cliente_email: { type: 'string' },
        worker_id: { type: 'string', description: 'ID del profesional (opcional)' },
        worker_nombre: { type: 'string', description: 'Nombre del profesional (opcional)' },
      },
      required: [
        'servicio_nombre', 'fecha', 'hora',
        'cliente_nombre', 'cliente_apellido', 'cliente_telefono',
      ],
    },
  },
  {
    name: 'cancelar_turno',
    description: 'Cancela el próximo turno del cliente por su número de teléfono',
    input_schema: {
      type: 'object' as const,
      properties: {
        telefono: { type: 'string', description: 'Número de teléfono del cliente' },
      },
      required: ['telefono'],
    },
  },
  {
    name: 'consultar_mi_turno',
    description: 'Consulta el próximo turno confirmado del cliente por su teléfono',
    input_schema: {
      type: 'object' as const,
      properties: {
        telefono: { type: 'string', description: 'Número de teléfono del cliente' },
      },
      required: ['telefono'],
    },
  },
];

// ─── Ejecución de tools ───────────────────────────────────────────────────────

/**
 * Ejecuta una tool específica y devuelve el resultado como string.
 * Cada tool encapsula su propio manejo de errores para no interrumpir el loop.
 */
async function executeTool(
  toolName: string,
  toolInput: Record<string, any>,
  configWeb: any,
  negocio: any,
  negocioId: string
): Promise<string> {
  try {
    const slug = negocio.slug;

    switch (toolName) {
      case 'listar_servicios': {
        const items = configWeb.servicios?.items || [];
        if (!items.length) return 'No hay servicios configurados.';
        const lista = items
          .map((s: any) => `- ${s.titulo}: $${s.precio}, ${s.duracion} minutos`)
          .join('\n');
        return `Servicios disponibles:\n${lista}`;
      }

      case 'listar_profesionales': {
        const servicioNombre = toolInput.servicio_nombre as string;
        const servicios = configWeb.servicios?.items || [];
        const servicio = servicios.find((s: any) =>
          s.titulo.toLowerCase().includes(servicioNombre.toLowerCase())
        );
        if (!servicio) return `No encontré el servicio "${servicioNombre}".`;

        const equipo = configWeb.equipo?.items || [];
        const workerIds: string[] = servicio.workerIds || [];

        if (!workerIds.length) {
          if (!equipo.length) return 'No hay profesionales asignados.';
          const lista = equipo.map((e: any) => `- ${e.nombre} (ID: ${e.id})`).join('\n');
          return `Profesionales disponibles para ${servicio.titulo}:\n${lista}`;
        }

        const asignados = equipo.filter((e: any) => workerIds.includes(e.id));
        if (!asignados.length) return 'No hay profesionales asignados a este servicio.';
        const lista = asignados.map((e: any) => `- ${e.nombre} (ID: ${e.id})`).join('\n');
        return `Profesionales para ${servicio.titulo}:\n${lista}`;
      }

      case 'consultar_disponibilidad': {
        const { fecha, servicio_nombre, worker_id } = toolInput as {
          fecha: string;
          servicio_nombre: string;
          worker_id?: string;
        };

        const servicios = configWeb.servicios?.items || [];
        const servicio = servicios.find((s: any) =>
          s.titulo.toLowerCase().includes(servicio_nombre.toLowerCase())
        );
        if (!servicio) return `No encontré el servicio "${servicio_nombre}".`;

        const result = await checkAvailability(slug, fecha, worker_id);
        if (!result.success) return `Error al consultar disponibilidad: ${result.error}`;

        // El schedule global se guarda en config_web.schedule (WeeklySchedule)
        const schedule = configWeb.schedule || configWeb.calendar?.schedule;
        if (!schedule) return 'No hay horarios configurados para este negocio.';

        // Obtener schedule específico del profesional si corresponde
        let workerSchedule;
        if (worker_id) {
          const equipo = configWeb.equipo?.items || [];
          const worker = equipo.find((e: any) => e.id === worker_id);
          workerSchedule = worker?.schedule;
        }

        const slots = generateTimeSlots({
          date: fecha,
          serviceDuration: servicio.duracion || 60,
          schedule,
          busySlots: result.busy,
          intervalStep: 30,
          workerSchedule,
        });

        const disponibles = slots.filter((s) => s.available).map((s) => s.time);
        if (!disponibles.length) return `No hay turnos disponibles para el ${fecha}.`;

        return `Horarios disponibles para ${servicio.titulo} el ${fecha}:\n${disponibles.join(', ')}`;
      }

      case 'crear_turno': {
        const {
          servicio_nombre, fecha, hora,
          cliente_nombre, cliente_apellido, cliente_telefono, cliente_email,
          worker_id, worker_nombre,
        } = toolInput as {
          servicio_nombre: string; fecha: string; hora: string;
          cliente_nombre: string; cliente_apellido: string;
          cliente_telefono: string; cliente_email?: string;
          worker_id?: string; worker_nombre?: string;
        };

        const servicios = configWeb.servicios?.items || [];
        const servicio = servicios.find((s: any) =>
          s.titulo.toLowerCase().includes(servicio_nombre.toLowerCase())
        );
        if (!servicio) return `No encontré el servicio "${servicio_nombre}".`;

        // Calcular hora de fin basada en duración del servicio
        const startDate = new Date(`${fecha}T${hora}:00`);
        const endDate = new Date(startDate.getTime() + (servicio.duracion || 60) * 60 * 1000);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const endHora = `${pad(endDate.getHours())}:${pad(endDate.getMinutes())}`;

        const payload: CreateAppointmentPayload = {
          clientName: cliente_nombre,
          clientLastName: cliente_apellido,
          clientPhone: cliente_telefono,
          clientEmail: cliente_email || '',
          service: servicio.titulo,
          start: `${fecha}T${hora}:00`,
          end: `${fecha}T${endHora}:00`,
          workerId: worker_id,
          workerName: worker_nombre,
          message: 'Reserva realizada por WhatsApp Bot',
        };

        const result = await createAppointment(slug, payload);
        if (!result.success) return `Error al crear el turno: ${result.error}`;

        if (result.pending) {
          return `✅ Turno solicitado para ${servicio.titulo} el ${fecha} a las ${hora}. Queda pendiente de confirmación. Te avisaremos cuando esté confirmado.`;
        }

        return `✅ Turno confirmado para ${servicio.titulo} el ${fecha} a las ${hora}. ¡Te esperamos, ${cliente_nombre}!`;
      }

      case 'cancelar_turno': {
        const { telefono } = toolInput as { telefono: string };
        const supabase = getSupabaseAdmin();

        const now = new Date().toISOString();
        const { data: turno } = await supabase
          .from('turnos')
          .select('*')
          .eq('negocio_id', negocioId)
          .eq('cliente_telefono', telefono)
          .in('estado', ['confirmado', 'pendiente'])
          .gte('start', now)
          .order('start', { ascending: true })
          .limit(1)
          .single();

        if (!turno) return 'No encontré ningún turno próximo para ese número de teléfono.';

        // Cancelar evento de Google Calendar si existe (mismo patrón que cancel-appointment.ts)
        if (turno.google_event_id && negocio.google_refresh_token) {
          try {
            const { google } = await import('googleapis');
            const auth = new google.auth.OAuth2(
              process.env.GOOGLE_CLIENT_ID,
              process.env.GOOGLE_CLIENT_SECRET
            );
            auth.setCredentials({ refresh_token: negocio.google_refresh_token });
            const calendar = google.calendar({ version: 'v3', auth });
            await calendar.events.delete({
              calendarId: 'primary',
              eventId: turno.google_event_id,
            });
          } catch (e) {
            // Si falla GCal, igual cancelamos en Supabase
            console.error('[WHATSAPP-BOT] Error cancelando evento de GCal:', e);
          }
        }

        await supabase
          .from('turnos')
          .update({ estado: 'cancelado' })
          .eq('id', turno.id);

        const fecha = new Date(turno.start).toLocaleDateString('es-AR');
        const hora = new Date(turno.start).toLocaleTimeString('es-AR', {
          hour: '2-digit', minute: '2-digit',
        });
        return `✅ Tu turno del ${fecha} a las ${hora} fue cancelado correctamente.`;
      }

      case 'consultar_mi_turno': {
        const { telefono } = toolInput as { telefono: string };
        const supabase = getSupabaseAdmin();

        const now = new Date().toISOString();
        const { data: turno } = await supabase
          .from('turnos')
          .select('*')
          .eq('negocio_id', negocioId)
          .eq('cliente_telefono', telefono)
          .eq('estado', 'confirmado')
          .gte('start', now)
          .order('start', { ascending: true })
          .limit(1)
          .single();

        if (!turno) return 'No tenés ningún turno próximo confirmado.';

        const fecha = new Date(turno.start).toLocaleDateString('es-AR');
        const hora = new Date(turno.start).toLocaleTimeString('es-AR', {
          hour: '2-digit', minute: '2-digit',
        });
        return `Tu próximo turno: ${turno.servicio || 'Turno'} el ${fecha} a las ${hora}${
          turno.saas_worker_name ? ` con ${turno.saas_worker_name}` : ''
        }.`;
      }

      default:
        return 'Tool desconocida.';
    }
  } catch (error) {
    console.error(`[WHATSAPP-BOT] Error en tool ${toolName}:`, error);
    return 'Error interno al ejecutar la acción. Por favor, intentá de nuevo.';
  }
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Maneja un mensaje de WhatsApp entrante.
 * Orquesta: verificación de acceso → historial → loop Claude tool use → respuesta.
 *
 * @param negocioId - ID del negocio
 * @param phone - Número de teléfono del usuario (sin @s.whatsapp.net)
 * @param userMessage - Texto del mensaje recibido
 * @returns Texto de respuesta a enviar por WhatsApp
 */
export async function handleWhatsAppMessage(
  negocioId: string,
  phone: string,
  userMessage: string
): Promise<string> {
  // 1. Verificar que el bloque esté activo y el chatbot habilitado
  const { allowed, configWeb, negocio } = await verifyAccess(negocioId);
  if (!allowed) {
    return 'Lo siento, el servicio de chatbot no está disponible en este momento.';
  }

  // 2. Obtener o crear conversación (sesión de 2hs)
  const conversation = await getOrCreateConversation(negocioId, phone);

  // 3. Agregar mensaje del usuario al historial
  const newUserMessage: ConversationMessage = {
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
  };
  const updatedMessages: ConversationMessage[] = [...conversation.messages, newUserMessage];

  // 4. Construir messages para la API de Claude
  const apiMessages: Anthropic.MessageParam[] = updatedMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // 5. Loop de tool use (máx MAX_ITERATIONS para evitar bucles infinitos)
  let iterations = 0;
  let finalResponse = '';
  let currentMessages = apiMessages;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(configWeb, negocio),
      tools: TOOLS,
      messages: currentMessages,
    });

    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find((b) => b.type === 'text');
      finalResponse = textBlock ? (textBlock as Anthropic.TextBlock).text : '';
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (b) => b.type === 'tool_use'
      ) as Anthropic.ToolUseBlock[];

      // Agregar respuesta del asistente (con los tool_use blocks)
      currentMessages = [
        ...currentMessages,
        { role: 'assistant', content: response.content },
      ];

      // Ejecutar cada tool en paralelo y agregar resultados
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (toolBlock) => {
          const result = await executeTool(
            toolBlock.name,
            toolBlock.input as Record<string, any>,
            configWeb,
            negocio,
            negocioId
          );
          return {
            type: 'tool_result' as const,
            tool_use_id: toolBlock.id,
            content: result,
          };
        })
      );

      currentMessages = [
        ...currentMessages,
        { role: 'user', content: toolResults },
      ];
      continue;
    }

    // Stop reason inesperado — extraer texto si hay
    const textBlock = response.content.find((b) => b.type === 'text');
    finalResponse = textBlock
      ? (textBlock as Anthropic.TextBlock).text
      : 'Ocurrió un error. Por favor, intentá de nuevo.';
    break;
  }

  if (!finalResponse) {
    finalResponse = 'Ocurrió un error procesando tu mensaje. Por favor, intentá de nuevo.';
  }

  // 6. Guardar respuesta del asistente en el historial
  const assistantMessage: ConversationMessage = {
    role: 'assistant',
    content: finalResponse,
    timestamp: new Date().toISOString(),
  };
  const finalMessages = [...updatedMessages, assistantMessage];

  await updateConversation(conversation.id, { messages: finalMessages });

  return finalResponse;
}
