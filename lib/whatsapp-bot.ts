// lib/whatsapp-bot.ts
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { generateTimeSlots } from '@/lib/time-slots';

const anthropic = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 250;
const MAX_HISTORY = 8;

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

interface ConvMessage { role: 'user' | 'assistant'; content: string; }

export function resolveNegocioFromInstance(instanceName: string): number | null {
  if (!instanceName) return null;
  const match = instanceName.match(/^negocio_(\d+)$/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

export async function verifyAccess(negocioId: number): Promise<{ allowed: boolean }> {
  try {
    const { data: block } = await supabaseAdmin.from('tenant_blocks').select('active').eq('negocio_id', negocioId).eq('block_id', 'chatbot').eq('active', true).maybeSingle();
    if (!block) return { allowed: false };
    const { data: neg } = await supabaseAdmin.from('negocios').select('config_web').eq('id', negocioId).single();
    if (!neg) return { allowed: false };
    const enabled = (neg.config_web as any)?.chatbot?.enabled === true;
    return { allowed: enabled };
  } catch { return { allowed: false }; }
}

// BUG 1 fix: generar mini calendario de los próximos 14 días para que Claude
// no calcule días de semana por su cuenta.
function generarCalendario(): string {
  const lines: string[] = [];
  const now = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const fecha = d.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
    const diaSemana = d.toLocaleDateString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      weekday: 'long'
    });
    const isoDate = d.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
    lines.push(`${diaSemana} ${fecha} (${isoDate})`);
  }
  return lines.join('\n');
}

// BUG 2 fix: detectar si el mensaje del usuario es relevante al negocio.
// Solo se incrementa el contador off-topic si el mensaje NO es relevante.
function isRelevantMessage(userMessage: string): boolean {
  const keywords = [
    'turno', 'hora', 'fecha', 'reserv', 'cancel', 'corte', 'pelo', 'alisado',
    'colorado', 'servicio', 'profesional', 'victoria', 'andre', 'lunes', 'martes',
    'miércoles', 'jueves', 'viernes', 'sábado', 'domingo', 'mañana', 'email',
    'gmail', 'hotmail', 'yahoo', '@', 'si', 'sí', 'no', 'dale', 'perfecto',
    'quiero', 'necesito', 'puede', 'disponib', 'horario', 'precio', 'cuanto',
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre', 'hola', 'buenas',
    'ok', 'okey', 'claro', 'bien', 'gracias', 'genial', 'listo', 'confirmado',
  ];
  const lower = userMessage.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

const TOOLS: Anthropic.Tool[] = [
  { name: 'listar_servicios', description: 'Lista servicios del negocio.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'listar_profesionales', description: 'Lista profesionales para un servicio.', input_schema: { type: 'object' as const, properties: { servicio: { type: 'string' } }, required: ['servicio'] } },
  {
    name: 'consultar_disponibilidad',
    description: 'Horarios libres para una fecha. Para múltiples servicios, pasar todos en "servicios" array para calcular duración total.',
    input_schema: {
      type: 'object' as const,
      properties: {
        fecha: { type: 'string', description: 'Fecha YYYY-MM-DD' },
        servicio: { type: 'string', description: 'Servicio único (si es uno solo)' },
        servicios: { type: 'array', items: { type: 'string' }, description: 'Lista de servicios para calcular duración total' },
        worker_id: { type: 'string' },
      },
      required: ['fecha'],
    },
  },
  {
    name: 'crear_turno',
    description: 'Crea turno con TODOS los datos. Para múltiples servicios usar "servicios" (array). Para uno solo usar "servicio" (string).',
    input_schema: {
      type: 'object' as const,
      properties: {
        servicios: { type: 'array', items: { type: 'string' }, description: 'Lista de servicios. Usar cuando hay 2 o más. Ej: ["Corte de pelo", "Alisado"]' },
        servicio: { type: 'string', description: 'Servicio único (si es solo uno)' },
        worker_id: { type: 'string' },
        worker_name: { type: 'string' },
        fecha: { type: 'string' },
        hora: { type: 'string' },
        nombre_cliente: { type: 'string' },
        email_cliente: { type: 'string' },
      },
      required: ['fecha', 'hora', 'nombre_cliente', 'email_cliente'],
    },
  },
  { name: 'cancelar_turno', description: 'Cancela turno del cliente.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'consultar_mi_turno', description: 'Proximo turno del cliente.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
];

interface NegocioCtx { negocio: any; configWeb: any; servicios: any[]; equipo: any[]; schedule: any; slug: string; bookingConfig: any; }

async function loadCtx(id: number): Promise<NegocioCtx | null> {
  try {
    const { data, error } = await supabaseAdmin.from('negocios').select('*').eq('id', id).single();
    if (error || !data) return null;
    const cw = data.config_web || {};
    return { negocio: data, configWeb: cw, servicios: cw.servicios?.items || [], equipo: cw.equipo?.items || [], schedule: cw.schedule || {}, slug: data.slug, bookingConfig: cw.booking || {} };
  } catch { return null; }
}

function buildPrompt(ctx: NegocioCtx, phone: string): string {
  const chatbotConfig = ctx.configWeb.chatbot || {};
  const name = chatbotConfig.business_name || ctx.configWeb.hero?.titulo || ctx.negocio.nombre || 'el negocio';
  const tone: string = chatbotConfig.tone || 'friendly';
  const additionalInfo: string = chatbotConfig.additional_info || '';
  const cancellationHours: number = chatbotConfig.cancellation_hours ?? 0;
  const svcs = ctx.servicios.length ? ctx.servicios.map(s => `- ${s.titulo}: $${s.precio || 'Consultar'} (${s.duracion} min)`).join('\n') : 'No hay servicios.';
  const team = ctx.equipo.length ? ctx.equipo.map(w => `- ${w.nombre} (${w.cargo || 'Profesional'}) [ID: ${w.id}]`).join('\n') : '';
  const dias = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
  const sch = Object.entries(ctx.schedule).map(([d,c]: [string,any]) => { if (!c?.isOpen) return `${dias[Number(d)]}: Cerrado`; const r = c.ranges?.map((x:any)=>`${x.start}-${x.end}`).join(', ')||'09:00-18:00'; return `${dias[Number(d)]}: ${r}`; }).join('\n');

  const now = new Date();
  const hoyISO = now.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
  const hoyDia = now.toLocaleDateString('es-AR', { weekday: 'long', timeZone: 'America/Argentina/Buenos_Aires' });
  const hoyFecha = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' });

  // BUG 1 fix: mini calendario para que Claude no calcule días de semana.
  const calendario = generarCalendario();

  let extra = '';
  if (ctx.bookingConfig.requireManualConfirmation) extra += '\nNegocio con confirmacion manual.';
  if (ctx.bookingConfig.requestDeposit) extra += `\nPide senia del ${ctx.bookingConfig.depositPercentage||50}%.`;

  const reglaDias = `
CALENDARIO (próximos 14 días - usá SOLO este calendario para fechas):
${calendario}

REGLAS DE FECHAS:
1. Usá ÚNICAMENTE este calendario para resolver fechas. NO calcules días de semana por tu cuenta.
2. Si el cliente dice "el martes", buscá en el calendario cuál es el próximo martes y usá esa fecha. NO preguntes confirmación.
3. Si el cliente dice "martes 7 de abril", verificá en el calendario. Si coincide, usá esa fecha. Si NO coincide, decile: "El 7 de abril es [día real]. ¿Querés el [día real] 7 de abril o el martes [fecha del martes]?"
4. Si el cliente da solo una fecha numérica ("el 9 de abril"), buscala en el calendario y usá el día que corresponda. NO pidas confirmación.
5. Si el cliente dice "mañana", usá la segunda línea del calendario.
6. NUNCA digas que una fecha "puede ser en diferentes años". Siempre es 2026.
7. Una vez que tengas la fecha, llamá a consultar_disponibilidad INMEDIATAMENTE con el formato YYYY-MM-DD. No pidas más confirmación.`;

  // BUG 3 fix: regla para evitar que el bot cree un turno nuevo cuando el
  // cliente quiere modificar datos después de haber confirmado uno.
  const reglaTurnosDuplicados = `
REGLA CRITICA - TURNOS DUPLICADOS:
Si el turno ya fue confirmado y el cliente quiere cambiar datos, NO crees turno nuevo. Decile que contacte al negocio para modificar. NUNCA crees dos turnos para el mismo horario.`;

  // BUG 1 fix: regla para que el bot nunca reemplace turnos existentes.
  const reglaMultiplesTurnos = `
REGLA DE MÚLTIPLES TURNOS:
- Un cliente puede tener múltiples turnos reservados simultáneamente.
- Si el cliente pide un turno nuevo (ej: "quiero un turno para el miércoles"), creá un turno NUEVO sin tocar los existentes.
- Si el cliente pide CAMBIAR o MOVER un turno existente (ej: "quiero cambiar mi turno del lunes al miércoles", "puedo mover mi turno?"), primero cancelá el turno viejo con cancelar_turno y después creá el nuevo con crear_turno.
- NUNCA cambies un turno existente sin que el cliente lo pida explícitamente.
- Ante la duda, preguntale: "¿Querés un turno nuevo además del que ya tenés, o querés cambiar el turno del [fecha]?"`;

  const reglaMultiServicio = `
REGLA MULTI-SERVICIO:
Si el cliente quiere múltiples servicios, agendalo en UN SOLO turno con la duración sumada.
Usá el campo "servicios" (array) al llamar a crear_turno. Ejemplo: ["Corte de pelo", "Alisado"].
Para consultar_disponibilidad con múltiples servicios, también usá el campo "servicios" array.`;

  // Instrucción de tono según configuración del negocio
  let toneInstruction = '';
  if (tone === 'formal') toneInstruction = 'Usá "usted", sé profesional y cortés.';
  else if (tone === 'casual') toneInstruction = 'Sé relajado, podés usar humor cuando sea apropiado.';
  else toneInstruction = 'Sé amigable, usá "vos", cercano pero profesional.';

  const additionalInfoSection = additionalInfo
    ? `\nINFO ADICIONAL DEL NEGOCIO:\n${additionalInfo}`
    : '';

  const cancellationRule = cancellationHours > 0
    ? `\nCANCELACIÓN: No permitir cancelar con menos de ${cancellationHours} horas de anticipación. Si el cliente intenta cancelar y su turno es en menos de ${cancellationHours} horas, informale que ya no es posible cancelar.`
    : '';

  return `Sos el asistente de "${name}" por WhatsApp.\n\nSERVICIOS:\n${svcs}\n${team?`\nEQUIPO:\n${team}`:'\nSin equipo.'}\n\nHORARIOS:\n${sch||'No config'}${extra}\n\nREGLAS:\n- Espaniol argentino, conciso, emojis moderados.\n- ${toneInstruction}\n- Tel cliente: ${phone}. NO pedirlo.\n- Flujo: servicio->profesional->fecha->horario->nombre->email->confirmar.\n- HOY es ${hoyDia} ${hoyISO} (${hoyFecha}).\n- 1 profesional = seleccionar auto. Sin equipo = no preguntar.\n- Confirmar con resumen antes de crear.\n${reglaDias}${reglaTurnosDuplicados}${reglaMultiplesTurnos}${reglaMultiServicio}${cancellationRule}${additionalInfoSection}`;
}

async function getConv(nid: number, phone: string) {
  try {
    const { data } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('*')
      .eq('negocio_id', nid)
      .eq('phone_number', phone)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (data?.length) {
      const conv = data[0];
      const lastActivity = new Date(conv.updated_at);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const shouldResetState = lastActivity < twoHoursAgo;

      return {
        id: conv.id,
        messages: conv.messages || [],
        draft: shouldResetState ? {} : (conv.booking_draft || {}),
        stage: shouldResetState ? 'idle' : (conv.stage || 'idle'),
      };
    }

    const { data: c, error } = await supabaseAdmin
      .from('whatsapp_conversations')
      .insert({ negocio_id: nid, phone_number: phone, messages: [], booking_draft: {}, stage: 'idle' })
      .select('id')
      .single();
    if (error || !c) return { id: 'tmp-' + Date.now(), messages: [], draft: {}, stage: 'idle' };
    return { id: c.id, messages: [], draft: {}, stage: 'idle' };
  } catch {
    return { id: 'tmp-' + Date.now(), messages: [], draft: {}, stage: 'idle' };
  }
}

async function saveConv(id: string, msgs: ConvMessage[], draft: any, stage: string) {
  if (id.startsWith('tmp-')) return;
  try {
    await supabaseAdmin
      .from('whatsapp_conversations')
      .update({ messages: msgs, booking_draft: draft, stage, updated_at: new Date().toISOString() })
      .eq('id', id);
  } catch {}
}

/** Convierte "HH:MM" a minutos desde medianoche. */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Convierte minutos desde medianoche a "HH:MM". */
function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * Verifica si un slot (en hora argentina "HH:MM") está disponible,
 * considerando la duración del servicio y el horario de cierre.
 */
function isSlotAvailable(
  slotTime: string,
  durationMinutes: number,
  busyRanges: { start: string; end: string }[],
  closingTime: string
): boolean {
  const slotStart = timeToMinutes(slotTime);
  const slotEnd = slotStart + durationMinutes;
  const closing = timeToMinutes(closingTime);

  if (slotEnd > closing) return false;

  for (const range of busyRanges) {
    const busyStart = timeToMinutes(range.start);
    const busyEnd = timeToMinutes(range.end);
    if (slotStart < busyEnd && slotEnd > busyStart) return false;
  }

  return true;
}

async function runTool(name: string, input: any, ctx: NegocioCtx, phone: string): Promise<string> {
  try {
    switch(name) {
      case 'listar_servicios': return JSON.stringify({success:true,servicios:ctx.servicios.map(s=>({nombre:s.titulo,precio:s.precio||'Consultar',duracion:`${s.duracion} min`}))});
      case 'listar_profesionales': {
        const svc=ctx.servicios.find(s=>s.titulo.toLowerCase()===(input.servicio||'').toLowerCase());
        let p=ctx.equipo; if(svc?.workerIds?.length) p=ctx.equipo.filter(w=>svc.workerIds.includes(w.id));
        return JSON.stringify({success:true,profesionales:p.map(w=>({id:w.id,nombre:w.nombre}))});
      }
      case 'consultar_disponibilidad': {
        const fechaObj = new Date(input.fecha + 'T00:00:00');
        const diaSemana = fechaObj.toLocaleDateString('es-AR', { weekday: 'long' });

        const diasAbiertos = Object.entries(ctx.schedule)
          .filter(([, c]: [string, any]) => c?.isOpen)
          .map(([d]) => Number(d));

        if (diasAbiertos.length > 0 && !diasAbiertos.includes(fechaObj.getDay())) {
          const nombresDiasAbiertos = diasAbiertos.map(n =>
            ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'][n]
          ).join(', ');
          return JSON.stringify({
            success: false,
            fecha: input.fecha,
            dia_semana: diaSemana,
            error: `El negocio no atiende los ${diaSemana}s. Dias de atencion: ${nombresDiasAbiertos}.`,
          });
        }

        // BUG 3 fix: calcular duración total si vienen múltiples servicios
        const serviciosList: string[] = input.servicios || (input.servicio ? [input.servicio] : []);
        let duracionTotal = 0;
        for (const servicioName of serviciosList) {
          const serv = ctx.servicios.find((s: any) =>
            s.titulo.toLowerCase().includes(servicioName.toLowerCase()) ||
            servicioName.toLowerCase().includes(s.titulo.toLowerCase())
          );
          duracionTotal += serv?.duracion || 0;
        }
        if (duracionTotal === 0) {
          const svc = ctx.servicios.find((s: any) => s.titulo.toLowerCase() === (input.servicio || '').toLowerCase());
          duracionTotal = svc?.duracion || 60;
        }

        const {checkAvailability}=await import('@/blocks/calendar/actions/check-availability');
        const r=await checkAvailability(ctx.slug,input.fecha,input.worker_id);
        if(!r.success) return JSON.stringify({success:false,fecha:input.fecha,dia_semana:diaSemana,error:(r as any).error});
        if(!('busy' in r)) return JSON.stringify({success:false,fecha:input.fecha,dia_semana:diaSemana,error:'Error al verificar disponibilidad'});

        // BUG 4 fix: incluir turnos de Supabase (pendientes no están en Google Calendar)
        const { data: turnosSupabase, error: turnosError } = await supabaseAdmin
          .from('turnos')
          .select('fecha_inicio, fecha_fin')
          .eq('negocio_id', ctx.negocio.id)
          .in('estado', ['confirmado', 'pendiente', 'esperando_senia'])
          .gte('fecha_inicio', `${input.fecha}T00:00:00-03:00`)
          .lte('fecha_inicio', `${input.fecha}T23:59:59-03:00`);


        const busySlotsSupabase = (turnosSupabase || []).map((t: any) => ({
          start: t.fecha_inicio,
          end: t.fecha_fin,
        }));


        const allBusySlots = [...r.busy, ...busySlotsSupabase];

        // Convertir busy slots ISO (con cualquier offset) a hora argentina local para filtrar correctamente
        function isoToArgentinaTime(isoString: string): string {
          const date = new Date(isoString);
          return date.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'America/Argentina/Buenos_Aires',
          });
        }

        const busyRanges = allBusySlots.map(slot => ({
          start: isoToArgentinaTime(slot.start),
          end: isoToArgentinaTime(slot.end),
        }));


        let ws; if(input.worker_id&&ctx.configWeb.equipo?.scheduleType==='per_worker'){const w=ctx.equipo.find((x: any)=>x.id===input.worker_id);ws=w?.schedule;}

        // Obtener closing time del día para isSlotAvailable
        const scheduleToUse = ws || ctx.schedule;
        const dayKey = String(fechaObj.getDay());
        const dayConfigForClosing = scheduleToUse[dayKey];
        const dayRanges = dayConfigForClosing?.ranges || [];
        const closingTime = dayRanges.length > 0 ? dayRanges[dayRanges.length - 1].end : '18:00';

        // generateTimeSlots SIN busySlots (evita timezone mismatch) — filtra por schedule y duración
        const slots = generateTimeSlots({ date: input.fecha, serviceDuration: duracionTotal, schedule: ctx.schedule, busySlots: [], workerSchedule: ws });

        // Filtrar con isSlotAvailable usando Argentine time strings (busyRanges ya está convertido)
        const av = slots.filter(s => s.available).map(s => s.time).filter(slot =>
          isSlotAvailable(slot, duracionTotal, busyRanges, closingTime)
        );
        return JSON.stringify({
          success: true,
          fecha: input.fecha,
          dia_semana: diaSemana,
          horarios_disponibles: av,
          total: av.length,
          mensaje: `Fecha consultada: ${diaSemana} ${input.fecha}`,
        });
      }
      case 'crear_turno': {
        // BUG 3 fix: resolver servicios desde array "servicios" o string "servicio"
        const serviciosList: string[] = input.servicios || (input.servicio ? [input.servicio] : []);
        if (serviciosList.length === 0) {
          return JSON.stringify({ success: false, error: 'No se especificó ningún servicio.' });
        }

        let duracionTotal = 0;
        let precioTotal = 0;
        const serviciosInfo: string[] = [];
        for (const servicioName of serviciosList) {
          const serv = ctx.servicios.find((s: any) =>
            s.titulo.toLowerCase().includes(servicioName.toLowerCase()) ||
            servicioName.toLowerCase().includes(s.titulo.toLowerCase())
          );
          if (serv) {
            duracionTotal += serv.duracion || 30;
            precioTotal += serv.precio || 0;
            serviciosInfo.push(serv.titulo);
          } else {
            duracionTotal += 30;
            serviciosInfo.push(servicioName);
          }
        }
        if (duracionTotal === 0) duracionTotal = 30;

        const servicioDisplay = serviciosInfo.join(' + ');

        const horaNorm = input.hora.split(':').slice(0, 2).join(':');

        // Validar que el turno no exceda el horario de cierre
        const crearDayKey = String(new Date(input.fecha + 'T00:00:00').getDay());
        const crearDayConfig = ctx.schedule[crearDayKey];
        const crearRanges = crearDayConfig?.ranges || [];
        const crearClosingTime = crearRanges.length > 0 ? crearRanges[crearRanges.length - 1].end : '23:59';
        const endMinutes = timeToMinutes(horaNorm) + duracionTotal;
        if (endMinutes > timeToMinutes(crearClosingTime)) {
          return JSON.stringify({
            success: false,
            error: `El turno terminaría a las ${minutesToTime(endMinutes)} pero el negocio cierra a las ${crearClosingTime}. Por favor elegí un horario más temprano.`
          });
        }

        const [startH, startM] = horaNorm.split(':').map(Number);
        const totalMinutes = startH * 60 + startM + duracionTotal;
        const endH = Math.floor(totalMinutes / 60) % 24;
        const endM = totalMinutes % 60;
        const pad = (n: number) => String(n).padStart(2, '0');
        const startStr = `${input.fecha}T${horaNorm}:00-03:00`;
        const endStr = `${input.fecha}T${pad(endH)}:${pad(endM)}:00-03:00`;

        const fechaInicioISO = startStr;
        const { data: turnoExistente } = await supabaseAdmin
          .from('turnos')
          .select('id')
          .eq('negocio_id', ctx.negocio.id)
          .eq('fecha_inicio', fechaInicioISO)
          .neq('estado', 'cancelado')
          .maybeSingle();
        if (turnoExistente) {
          return JSON.stringify({ success: false, error: 'Ya hay un turno reservado para ese horario. Por favor elegí otro horario disponible.' });
        }

        const {createAppointment}=await import('@/blocks/calendar/actions/create-appointment');
        const res=await createAppointment(ctx.slug,{
          service: servicioDisplay,
          start: startStr,
          end: endStr,
          clientName: input.nombre_cliente,
          clientPhone: phone,
          clientEmail: input.email_cliente,
          workerId: input.worker_id,
          workerName: input.worker_name,
          skipWhatsAppNotification: true,
        });

        // BUG 1 fix: limpiar booking_draft después de crear un turno exitoso
        // para que la próxima reserva del mismo cliente arranque de cero.
        if (res.success) {
          const { data: convRow } = await supabaseAdmin
            .from('whatsapp_conversations')
            .select('id')
            .eq('negocio_id', ctx.negocio.id)
            .eq('phone_number', phone)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (convRow?.id) {
            await supabaseAdmin
              .from('whatsapp_conversations')
              .update({ booking_draft: {}, stage: 'idle', client_name: input.nombre_cliente })
              .eq('id', convRow.id);
          }
        }

        return JSON.stringify({success:res.success,pendiente:res.pending||false,error:res.error});
      }
      case 'cancelar_turno': {
        const {data:t}=await supabaseAdmin.from('turnos').select('id,servicio,fecha_inicio,google_event_id').eq('negocio_id',ctx.negocio.id).eq('cliente_telefono',phone).in('estado',['confirmado','pendiente','esperando_senia']).order('fecha_inicio',{ascending:true}).limit(1).single();
        if(!t) return JSON.stringify({success:false,error:'No hay turno activo.'});
        if(t.google_event_id&&ctx.negocio.google_refresh_token){try{const{google}=await import('googleapis');const a=new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET);a.setCredentials({refresh_token:ctx.negocio.google_refresh_token});await google.calendar({version:'v3',auth:a}).events.delete({calendarId:'primary',eventId:t.google_event_id});}catch{}}
        await supabaseAdmin.from('turnos').update({estado:'cancelado'}).eq('id',t.id);
        return JSON.stringify({success:true,mensaje:`Cancelado: ${t.servicio}`});
      }
      case 'consultar_mi_turno': {
        const {data:t}=await supabaseAdmin.from('turnos').select('servicio,fecha_inicio,estado').eq('negocio_id',ctx.negocio.id).eq('cliente_telefono',phone).in('estado',['confirmado','pendiente','esperando_senia']).gt('fecha_inicio',new Date().toISOString()).order('fecha_inicio',{ascending:true}).limit(1).single();
        if(!t) return JSON.stringify({success:true,turno:null,mensaje:'No tenes turnos.'});
        const f=new Date(t.fecha_inicio).toLocaleString('es-AR',{timeZone:'America/Argentina/Buenos_Aires',weekday:'long',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
        return JSON.stringify({success:true,turno:{servicio:t.servicio,fecha:f,estado:t.estado}});
      }
      default: return JSON.stringify({success:false,error:'Tool desconocido'});
    }
  } catch(e:any) { return JSON.stringify({success:false,error:e?.message||'Error'}); }
}

export async function handleWhatsAppMessage(negocioId: number, phone: string, text: string, senderName?: string): Promise<string> {
  const ctx = await loadCtx(negocioId);
  if (!ctx) return '';
  const { allowed } = await verifyAccess(negocioId);
  if (!allowed) { return ''; }

  // Verificar cooldown (sin filtro de 2hs para que persista entre conversaciones)
  const { data: cooldownRow } = await supabaseAdmin
    .from('whatsapp_conversations')
    .select('id, off_topic_count, cooldown_until')
    .eq('negocio_id', negocioId)
    .eq('phone_number', phone)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cooldownRow?.cooldown_until && new Date(cooldownRow.cooldown_until) > new Date()) {
    return '¡Hola! En este momento no puedo asistirte. Escribime cuando necesites agendar un turno y con gusto te ayudo. 😊';
  }

  const conv = await getConv(negocioId, phone);
  const msgs: ConvMessage[] = [...conv.messages, { role: 'user', content: text }];
  // Solo enviar los últimos MAX_HISTORY mensajes a Claude para controlar tokens
  const cm: Anthropic.MessageParam[] = msgs.slice(-MAX_HISTORY).map(m => ({ role: m.role, content: m.content }));
  if (senderName && !conv.draft?.clientName) cm[cm.length-1] = { role: 'user', content: `[Nombre: ${senderName}]\n\n${text}` };
  try {
    let r = await anthropic.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system: buildPrompt(ctx, phone), tools: TOOLS, messages: cm });
    let i = 0;
    let usedAnyTool = false;
    while (r.stop_reason === 'tool_use' && i < 5) {
      i++;
      usedAnyTool = true;
      const tb = r.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      if (!tb) break;
      const tr = await runTool(tb.name, tb.input, ctx, phone);
      cm.push({ role: 'assistant', content: r.content });
      cm.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: tb.id, content: tr }] });
      r = await anthropic.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system: buildPrompt(ctx, phone), tools: TOOLS, messages: cm });
    }
    const reply = r.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text || '';
    if (reply) { await saveConv(conv.id, [...msgs, { role: 'assistant', content: reply }], conv.draft, conv.stage); }

    // Actualizar off_topic_count en la fila activa
    // BUG 2 fix: solo incrementar si el mensaje no es relevante al negocio Y no se usaron tools.
    const rowId = conv.id.startsWith('tmp-') ? (cooldownRow?.id || null) : conv.id;
    if (rowId && !String(rowId).startsWith('tmp-')) {
      if (!usedAnyTool && !isRelevantMessage(text)) {
        const currentCount = (cooldownRow?.off_topic_count || 0) + 1;
        const updates: Record<string, any> = { off_topic_count: currentCount };
        if (currentCount >= 3) {
          updates.cooldown_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        }
        await supabaseAdmin.from('whatsapp_conversations').update(updates).eq('id', rowId);
      } else {
        await supabaseAdmin.from('whatsapp_conversations').update({ off_topic_count: 0, cooldown_until: null }).eq('id', rowId);
      }
    }

    return reply;
  } catch (e: any) { console.error('[BOT] Error:', e?.message); return 'Disculpa, tuve un problema. Intenta de nuevo.'; }
}
