// lib/whatsapp-bot.ts
// SERVER-SIDE ONLY — motor principal del chatbot de WhatsApp con IA.
// Maneja conversaciones, tool calls a Anthropic y creación de turnos.

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { checkAvailability } from '@/app/actions/shared/check-availability';
import { generateTimeSlots } from '@/lib/time-slots';
import { sendWhatsAppNotification } from '@/lib/whatsapp-helper';
import type {
  WhatsappConversation,
  ConversationMessage,
  BookingDraft,
  ConversationStage,
} from '@/types/whatsapp-bot';

// Singleton Anthropic — una instancia por ciclo de vida del módulo
const anthropic = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';

// Singleton Supabase admin — usa service role key para bypass de RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Dedup en memoria: evita procesar el mismo mensaje dos veces por retries del webhook
const processedMessages = new Map<string, number>();

/**
 * Extrae el negocio_id a partir del nombre de instancia de Evolution API.
 * Formato esperado: "negocio_123" → 123
 */
export function resolveNegocioFromInstance(instanceName: string): number | null {
  const match = instanceName.match(/^negocio_(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Verifica si un mensaje ya fue procesado (dedup por 60 segundos).
 * Registra el messageId si no existe todavía.
 */
export function isMessageDuplicate(messageId: string): boolean {
  const now = Date.now();
  // Limpiar entradas viejas (> 60 segundos)
  for (const [id, ts] of processedMessages.entries()) {
    if (now - ts > 60000) processedMessages.delete(id);
  }
  if (processedMessages.has(messageId)) return true;
  processedMessages.set(messageId, now);
  return false;
}

/**
 * Obtiene una conversación activa (updated_at en las últimas 2 horas)
 * o crea una nueva si no existe.
 */
async function getOrCreateConversation(
  negocioId: number,
  phone: string
): Promise<WhatsappConversation> {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data: existing } = await supabaseAdmin
    .from('whatsapp_conversations')
    .select('*')
    .eq('negocio_id', negocioId)
    .eq('phone_number', phone)
    .gte('updated_at', twoHoursAgo)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) return existing as WhatsappConversation;

  const { data: created, error } = await supabaseAdmin
    .from('whatsapp_conversations')
    .insert({ negocio_id: negocioId, phone_number: phone })
    .select()
    .single();

  if (error) throw new Error(`[WhatsAppBot] No se pudo crear la conversación: ${error.message}`);
  return created as WhatsappConversation;
}

/**
 * Persiste el estado actualizado de la conversación.
 * Mantiene solo los últimos 20 mensajes para controlar el tamaño.
 */
async function updateConversation(
  id: string,
  messages: ConversationMessage[],
  draft: BookingDraft,
  stage: ConversationStage
): Promise<void> {
  const trimmed = messages.slice(-20);
  await supabaseAdmin
    .from('whatsapp_conversations')
    .update({ messages: trimmed, booking_draft: draft, stage })
    .eq('id', id);
}

/**
 * Construye el system prompt dinámico para Claude usando los datos del negocio.
 * Incluye servicios, equipo, fecha de hoy y reglas de comportamiento.
 */
function buildSystemPrompt(negocio: any, configWeb: any): string {
  const servicios = configWeb?.servicios?.items ?? [];
  const equipo = configWeb?.equipo?.items ?? [];
  const requireManual = configWeb?.booking?.requireManualConfirmation ?? false;

  const fechaHoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  });

  const serviciosText =
    servicios.length > 0
      ? servicios
          .map(
            (s: any) =>
              `- ${s.nombre} (ID: ${s.id}) | Precio: $${s.precio ?? 'consultar'} | Duración: ${s.duracion ?? 60} min`
          )
          .join('\n')
      : 'No hay servicios configurados.';

  const equipoText =
    equipo.length > 0
      ? equipo.map((p: any) => `- ${p.nombre} (ID: ${p.id})`).join('\n')
      : 'Sin profesionales asignados.';

  return `Sos el asistente virtual de ${negocio.nombre}. Atendés por WhatsApp y ayudás a los clientes a sacar turnos.

Fecha de hoy: ${fechaHoy}
Zona horaria: Argentina (América/Argentina/Buenos_Aires)

SERVICIOS DISPONIBLES:
${serviciosText}

PROFESIONALES:
${equipoText}

${requireManual ? 'IMPORTANTE: Los turnos requieren confirmación manual del negocio. Informale esto al cliente al confirmar.' : ''}

REGLAS:
- Hablá en español argentino, de manera cercana y amigable
- Usá emojis con moderación (estás en WhatsApp, no en email)
- Sé conciso, los mensajes de WhatsApp deben ser cortos
- Guiá al cliente paso a paso: servicio → profesional → fecha → horario → nombre → email → confirmación
- Ya tenés el número del cliente, NO lo pidas
- Para consultar disponibilidad siempre usá las tools disponibles
- Para crear el turno usá la tool crear_turno con todos los datos completos
- Si el cliente quiere cancelar, usá la tool cancelar_turno
- Siempre confirmá los datos antes de crear el turno

Al confirmar un turno exitoso, informale:
- Servicio, profesional, fecha y hora
- Precio${requireManual ? ' y que el turno queda pendiente de confirmación' : ''}`;
}

// Definición de tools disponibles para Claude
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'listar_servicios',
    description: 'Lista todos los servicios disponibles del negocio con nombre, precio y duración',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'listar_profesionales',
    description: 'Lista los profesionales disponibles, opcionalmente filtrados por servicio',
    input_schema: {
      type: 'object' as const,
      properties: {
        service_id: {
          type: 'string',
          description: 'ID del servicio para filtrar profesionales que lo realizan',
        },
      },
      required: [],
    },
  },
  {
    name: 'consultar_disponibilidad',
    description: 'Consulta los horarios disponibles para una fecha específica',
    input_schema: {
      type: 'object' as const,
      properties: {
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        service_id: { type: 'string', description: 'ID del servicio elegido' },
        worker_id: { type: 'string', description: 'ID del profesional (opcional)' },
      },
      required: ['fecha'],
    },
  },
  {
    name: 'crear_turno',
    description: 'Crea un nuevo turno con todos los datos del cliente',
    input_schema: {
      type: 'object' as const,
      properties: {
        service_id: { type: 'string', description: 'ID del servicio' },
        service_name: { type: 'string', description: 'Nombre del servicio' },
        service_price: { type: 'number', description: 'Precio del servicio' },
        service_duration: { type: 'number', description: 'Duración en minutos' },
        worker_id: { type: 'string', description: 'ID del profesional (opcional)' },
        worker_name: { type: 'string', description: 'Nombre del profesional (opcional)' },
        date: { type: 'string', description: 'Fecha YYYY-MM-DD' },
        time: { type: 'string', description: 'Hora HH:mm' },
        client_name: { type: 'string', description: 'Nombre del cliente' },
        client_email: { type: 'string', description: 'Email del cliente' },
        client_phone: { type: 'string', description: 'Teléfono del cliente' },
      },
      required: ['service_id', 'service_name', 'date', 'time', 'client_name', 'client_phone'],
    },
  },
  {
    name: 'cancelar_turno',
    description: 'Cancela el próximo turno del cliente',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_phone: { type: 'string', description: 'Teléfono del cliente' },
      },
      required: ['client_phone'],
    },
  },
  {
    name: 'consultar_mi_turno',
    description: 'Consulta el próximo turno del cliente',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_phone: { type: 'string', description: 'Teléfono del cliente' },
      },
      required: ['client_phone'],
    },
  },
];

/**
 * Ejecuta una tool call de Claude con los datos del negocio como contexto.
 * Cada case corresponde a una de las tools definidas arriba.
 */
async function executeTool(
  toolName: string,
  toolInput: any,
  negocio: any,
  configWeb: any,
  clientPhone: string
): Promise<string> {
  const servicios = configWeb?.servicios?.items ?? [];
  const equipo = configWeb?.equipo?.items ?? [];

  switch (toolName) {
    case 'listar_servicios': {
      if (servicios.length === 0) {
        return JSON.stringify({ error: 'No hay servicios configurados' });
      }
      return JSON.stringify({
        servicios: servicios.map((s: any) => ({
          id: s.id,
          nombre: s.nombre,
          precio: s.precio ?? null,
          duracion: s.duracion ?? 60,
        })),
      });
    }

    case 'listar_profesionales': {
      const { service_id } = toolInput;
      let workers = equipo;
      if (service_id) {
        const servicio = servicios.find((s: any) => s.id === service_id);
        if (servicio?.workerIds?.length) {
          workers = equipo.filter((p: any) => servicio.workerIds.includes(p.id));
        }
      }
      return JSON.stringify({
        profesionales: workers.map((p: any) => ({ id: p.id, nombre: p.nombre })),
      });
    }

    case 'consultar_disponibilidad': {
      const { fecha, worker_id, service_id } = toolInput;
      const result = await checkAvailability(negocio.slug, fecha, worker_id);
      if (!result.success) return JSON.stringify({ error: result.error });

      // Obtener duración del servicio para calcular slots correctamente
      const service = servicios.find((s: any) => s.id === service_id);
      const serviceDuration = service?.duracion ?? 60;

      // Usar schedule del profesional si se especificó, sino el global del negocio
      let schedule = configWeb?.horarios ?? configWeb?.schedule ?? null;
      if (worker_id && equipo.length > 0) {
        const worker = equipo.find((p: any) => p.id === worker_id);
        if (worker?.schedule) schedule = worker.schedule;
      }

      if (!schedule) return JSON.stringify({ error: 'No hay horarios configurados' });

      const slots = generateTimeSlots({
        date: fecha,
        busySlots: result.busy,
        schedule,
        serviceDuration,
        intervalStep: 30,
      });

      const available = slots.filter((s: any) => s.available).map((s: any) => s.time);
      return JSON.stringify({ fecha, horarios_disponibles: available });
    }

    case 'crear_turno': {
      const {
        service_id,
        service_name,
        service_price,
        service_duration,
        worker_id,
        worker_name,
        date,
        time,
        client_name,
        client_email,
        client_phone: inputPhone,
      } = toolInput;

      const duration = service_duration ?? 60;
      const startDate = new Date(`${date}T${time}:00`);
      const endDate = new Date(startDate.getTime() + duration * 60000);

      const bookingPayload = {
        service: service_id,
        serviceName: service_name,
        date,
        time,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        clientName: client_name,
        clientPhone: inputPhone ?? clientPhone,
        clientEmail: client_email ?? '',
        workerId: worker_id,
        workerName: worker_name,
        precio: service_price,
        duracion: duration,
      };

      const requireManual = configWeb?.booking?.requireManualConfirmation ?? false;

      let createResult: any;
      if (requireManual) {
        const { createAppointment } = await import(
          '@/app/actions/confirm-booking/manage-appointment'
        );
        createResult = await createAppointment(negocio.slug, bookingPayload);
      } else {
        const { createAppointment } = await import(
          '@/app/actions/service-booking/manage-appointment'
        );
        createResult = await createAppointment(negocio.slug, bookingPayload);
      }

      if (createResult?.error) {
        return JSON.stringify({ success: false, error: createResult.error });
      }
      return JSON.stringify({
        success: true,
        requireManual,
        message: requireManual
          ? 'Turno creado, pendiente de confirmación'
          : 'Turno confirmado exitosamente',
      });
    }

    case 'cancelar_turno': {
      const phone = toolInput.client_phone ?? clientPhone;
      const cleanPhone = phone.replace(/\D/g, '');

      const { data: turno } = await supabaseAdmin
        .from('turnos')
        .select('id, google_event_id, fecha_inicio, servicio')
        .eq('negocio_id', negocio.id)
        .eq('cliente_telefono', cleanPhone)
        .gte('fecha_inicio', new Date().toISOString())
        .neq('estado', 'cancelado')
        .order('fecha_inicio', { ascending: true })
        .limit(1)
        .single();

      if (!turno) {
        return JSON.stringify({
          success: false,
          error: 'No se encontró un turno próximo para cancelar',
        });
      }

      await supabaseAdmin.from('turnos').update({ estado: 'cancelado' }).eq('id', turno.id);

      // Intentar eliminar el evento de Google Calendar si existe
      if (turno.google_event_id && negocio.google_refresh_token) {
        try {
          const { createGoogleCalendarClient } = await import(
            '@/app/actions/shared/google-auth'
          );
          const { calendar } = createGoogleCalendarClient(negocio.google_refresh_token);
          const calendarId = configWeb?.googleCalendarId ?? 'primary';
          await calendar.events.delete({ calendarId, eventId: turno.google_event_id });
        } catch (e) {
          console.error('[WhatsAppBot] No se pudo eliminar el evento de calendario:', e);
        }
      }

      return JSON.stringify({
        success: true,
        message: 'Turno cancelado correctamente',
        turno_id: turno.id,
      });
    }

    case 'consultar_mi_turno': {
      const phone = toolInput.client_phone ?? clientPhone;
      const cleanPhone = phone.replace(/\D/g, '');

      const { data: turno } = await supabaseAdmin
        .from('turnos')
        .select('id, fecha_inicio, fecha_fin, servicio, estado, cliente_nombre')
        .eq('negocio_id', negocio.id)
        .eq('cliente_telefono', cleanPhone)
        .gte('fecha_inicio', new Date().toISOString())
        .neq('estado', 'cancelado')
        .order('fecha_inicio', { ascending: true })
        .limit(1)
        .single();

      if (!turno) {
        return JSON.stringify({ error: 'No tenés turnos próximos reservados' });
      }

      const fecha = new Date(turno.fecha_inicio).toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Argentina/Buenos_Aires',
      });
      const hora = new Date(turno.fecha_inicio).toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Argentina/Buenos_Aires',
      });

      return JSON.stringify({
        turno: { fecha, hora, servicio: turno.servicio, estado: turno.estado },
      });
    }

    default:
      return JSON.stringify({ error: `Tool '${toolName}' no encontrada` });
  }
}

/**
 * Handler principal: procesa un mensaje entrante de WhatsApp.
 * Carga el negocio, verifica que el bloque esté activo, gestiona la conversación
 * con Claude (tool use loop) y retorna el texto de respuesta.
 */
export async function handleWhatsAppMessage(
  negocioId: number,
  phone: string,
  text: string,
  pushName?: string
): Promise<string> {
  // Cargar negocio con todos los campos necesarios
  const { data: negocio, error: negocioError } = await supabaseAdmin
    .from('negocios')
    .select('id, nombre, slug, whatsapp_access_token, google_refresh_token, config_web')
    .eq('id', negocioId)
    .single();

  if (negocioError || !negocio) {
    console.error('[WhatsAppBot] Negocio no encontrado:', negocioId);
    return '';
  }

  // Verificar que el bloque chatbot esté activo para este tenant
  const { data: blockActive } = await supabaseAdmin
    .from('tenant_blocks')
    .select('active')
    .eq('negocio_id', negocioId)
    .eq('block_id', 'chatbot')
    .single();

  if (!blockActive?.active) return '';

  // Verificar toggle de chatbot en config_web
  const configWeb = negocio.config_web ?? {};
  if (!configWeb?.chatbot?.enabled) return '';

  // Obtener o crear conversación activa
  const conversation = await getOrCreateConversation(negocioId, phone);

  // Agregar mensaje del usuario al historial
  const newMessage: ConversationMessage = { role: 'user', content: text };
  const messages: ConversationMessage[] = [...conversation.messages, newMessage];

  // Construir system prompt con contexto del negocio
  const systemPrompt = buildSystemPrompt(negocio, configWeb);

  // Convertir al formato de mensajes de Anthropic
  let anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Tool use loop — máximo 5 iteraciones para evitar bucles infinitos
  let assistantText = '';
  let iterations = 0;
  let finalStage: ConversationStage = conversation.stage;

  while (iterations < 5) {
    iterations++;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: systemPrompt,
      tools: TOOLS,
      messages: anthropicMessages,
    });

    if (response.stop_reason === 'end_turn') {
      // Claude terminó — extraer el texto de respuesta
      for (const block of response.content) {
        if (block.type === 'text') assistantText = block.text;
      }
      break;
    }

    if (response.stop_reason === 'tool_use') {
      // Agregar el turno del asistente con los tool_use blocks
      anthropicMessages.push({ role: 'assistant', content: response.content });

      // Ejecutar todas las tool calls en paralelo
      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        response.content
          .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
          .map(async (block) => {
            const result = await executeTool(
              block.name,
              block.input,
              negocio,
              configWeb,
              phone
            );
            // Detectar creación exitosa de turno para actualizar el stage
            if (block.name === 'crear_turno') {
              try {
                const parsed = JSON.parse(result);
                if (parsed.success === true) finalStage = 'completed';
              } catch {
                // resultado no parseable, no cambiar stage
              }
            }
            return {
              type: 'tool_result' as const,
              tool_use_id: block.id,
              content: result,
            };
          })
      );

      // Agregar resultados de tools como mensaje de usuario
      anthropicMessages.push({ role: 'user', content: toolResults });
    } else {
      // Stop reason desconocido — extraer texto si hay
      for (const block of response.content) {
        if (block.type === 'text') assistantText = block.text;
      }
      break;
    }
  }

  // Fallback si se agotaron las iteraciones sin generar texto
  if (!assistantText) {
    assistantText = 'Lo siento, no pude procesar tu consulta. Por favor, intentá de nuevo 🙏';
  }

  // Persistir conversación actualizada con el mensaje del asistente
  const updatedMessages: ConversationMessage[] = [
    ...messages,
    { role: 'assistant', content: assistantText },
  ];
  await updateConversation(
    conversation.id,
    updatedMessages,
    conversation.booking_draft,
    finalStage
  );

  return assistantText;
}
