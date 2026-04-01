// lib/whatsapp-bot.ts
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { generateTimeSlots } from '@/lib/time-slots';

const anthropic = new Anthropic();
const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 600;
const MAX_HISTORY = 20;

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

const TOOLS: Anthropic.Tool[] = [
  { name: 'listar_servicios', description: 'Lista servicios del negocio.', input_schema: { type: 'object' as const, properties: {}, required: [] } },
  { name: 'listar_profesionales', description: 'Lista profesionales para un servicio.', input_schema: { type: 'object' as const, properties: { servicio: { type: 'string' } }, required: ['servicio'] } },
  { name: 'consultar_disponibilidad', description: 'Horarios libres para una fecha.', input_schema: { type: 'object' as const, properties: { fecha: { type: 'string' }, servicio: { type: 'string' }, worker_id: { type: 'string' } }, required: ['fecha', 'servicio'] } },
  { name: 'crear_turno', description: 'Crea turno con TODOS los datos.', input_schema: { type: 'object' as const, properties: { servicio: { type: 'string' }, worker_id: { type: 'string' }, worker_name: { type: 'string' }, fecha: { type: 'string' }, hora: { type: 'string' }, nombre_cliente: { type: 'string' }, email_cliente: { type: 'string' } }, required: ['servicio', 'fecha', 'hora', 'nombre_cliente', 'email_cliente'] } },
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
  const name = ctx.configWeb.hero?.titulo || ctx.negocio.nombre || 'el negocio';
  const svcs = ctx.servicios.length ? ctx.servicios.map(s => `- ${s.titulo}: $${s.precio || 'Consultar'} (${s.duracion} min)`).join('\n') : 'No hay servicios.';
  const team = ctx.equipo.length ? ctx.equipo.map(w => `- ${w.nombre} (${w.cargo || 'Profesional'}) [ID: ${w.id}]`).join('\n') : '';
  const dias = ['Domingo','Lunes','Martes','Miercoles','Jueves','Viernes','Sabado'];
  const sch = Object.entries(ctx.schedule).map(([d,c]: [string,any]) => { if (!c?.isOpen) return `${dias[Number(d)]}: Cerrado`; const r = c.ranges?.map((x:any)=>`${x.start}-${x.end}`).join(', ')||'09:00-18:00'; return `${dias[Number(d)]}: ${r}`; }).join('\n');
  const today = new Date().toLocaleDateString('es-AR',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric',timeZone:'America/Argentina/Buenos_Aires'});
  let extra = '';
  if (ctx.bookingConfig.requireManualConfirmation) extra += '\nNegocio con confirmacion manual.';
  if (ctx.bookingConfig.requestDeposit) extra += `\nPide senia del ${ctx.bookingConfig.depositPercentage||50}%.`;
  return `Sos el asistente de "${name}" por WhatsApp.\n\nSERVICIOS:\n${svcs}\n${team?`\nEQUIPO:\n${team}`:'\nSin equipo.'}\n\nHORARIOS:\n${sch||'No config'}${extra}\n\nREGLAS:\n- Espaniol argentino, conciso, emojis moderados.\n- Tel cliente: ${phone}. NO pedirlo.\n- Flujo: servicio->profesional->fecha->horario->nombre->email->confirmar.\n- HOY: ${today}.\n- 1 profesional = seleccionar auto. Sin equipo = no preguntar.\n- Confirmar con resumen antes de crear.`;
}

async function getConv(nid: number, phone: string) {
  try {
    const cut = new Date(Date.now()-2*60*60*1000).toISOString();
    const { data } = await supabaseAdmin.from('whatsapp_conversations').select('*').eq('negocio_id',nid).eq('phone_number',phone).gt('updated_at',cut).order('updated_at',{ascending:false}).limit(1);
    if (data?.length) return { id: data[0].id, messages: data[0].messages||[], draft: data[0].booking_draft||{}, stage: data[0].stage||'idle' };
    const { data: c, error } = await supabaseAdmin.from('whatsapp_conversations').insert({negocio_id:nid,phone_number:phone,messages:[],booking_draft:{},stage:'idle'}).select('id').single();
    if (error||!c) return { id:'tmp-'+Date.now(), messages:[], draft:{}, stage:'idle' };
    return { id:c.id, messages:[], draft:{}, stage:'idle' };
  } catch { return { id:'tmp-'+Date.now(), messages:[], draft:{}, stage:'idle' }; }
}

async function saveConv(id: string, msgs: ConvMessage[], draft: any, stage: string) {
  if (id.startsWith('tmp-')) return;
  try { await supabaseAdmin.from('whatsapp_conversations').update({messages:msgs.slice(-MAX_HISTORY),booking_draft:draft,stage,updated_at:new Date().toISOString()}).eq('id',id); } catch {}
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
        const {checkAvailability}=await import('@/blocks/calendar/actions/check-availability');
        const r=await checkAvailability(ctx.slug,input.fecha,input.worker_id);
        if(!r.success) return JSON.stringify({success:false,error:(r as any).error});
        if(!('busy' in r)) return JSON.stringify({success:false,error:'Error'});
        const svc=ctx.servicios.find(s=>s.titulo.toLowerCase()===(input.servicio||'').toLowerCase());
        let ws; if(input.worker_id&&ctx.configWeb.equipo?.scheduleType==='per_worker'){const w=ctx.equipo.find(x=>x.id===input.worker_id);ws=w?.schedule;}
        const slots=generateTimeSlots({date:input.fecha,serviceDuration:svc?.duracion||60,schedule:ctx.schedule,busySlots:r.busy,workerSchedule:ws});
        const av=slots.filter(s=>s.available).map(s=>s.time);
        return JSON.stringify({success:true,fecha:input.fecha,horarios:av,total:av.length});
      }
      case 'crear_turno': {
        const svc=ctx.servicios.find(s=>s.titulo.toLowerCase()===input.servicio.toLowerCase());
        const d=svc?.duracion||60; const st=new Date(`${input.fecha}T${input.hora}:00`); const en=new Date(st.getTime()+d*60000);
        const {createAppointment}=await import('@/blocks/calendar/actions/create-appointment');
        const res=await createAppointment(ctx.slug,{service:input.servicio,start:st.toISOString(),end:en.toISOString(),clientName:input.nombre_cliente,clientPhone:phone,clientEmail:input.email_cliente,workerId:input.worker_id,workerName:input.worker_name});
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
  console.log(`[BOT] ${phone} -> negocio ${negocioId}`);
  const ctx = await loadCtx(negocioId);
  if (!ctx) return '';
  const { allowed } = await verifyAccess(negocioId);
  if (!allowed) { console.log('[BOT] Acceso denegado'); return ''; }
  const conv = await getConv(negocioId, phone);
  const msgs: ConvMessage[] = [...conv.messages, { role: 'user', content: text }];
  const cm: Anthropic.MessageParam[] = msgs.map(m => ({ role: m.role, content: m.content }));
  if (senderName && !conv.draft?.clientName) cm[cm.length-1] = { role: 'user', content: `[Nombre: ${senderName}]\n\n${text}` };
  try {
    let r = await anthropic.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system: buildPrompt(ctx, phone), tools: TOOLS, messages: cm });
    let i = 0;
    while (r.stop_reason === 'tool_use' && i < 5) {
      i++;
      const tb = r.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      if (!tb) break;
      console.log(`[BOT] Tool #${i}: ${tb.name}`);
      const tr = await runTool(tb.name, tb.input, ctx, phone);
      cm.push({ role: 'assistant', content: r.content });
      cm.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: tb.id, content: tr }] });
      r = await anthropic.messages.create({ model: MODEL, max_tokens: MAX_TOKENS, system: buildPrompt(ctx, phone), tools: TOOLS, messages: cm });
    }
    const reply = r.content.find((b): b is Anthropic.TextBlock => b.type === 'text')?.text || '';
    if (reply) { await saveConv(conv.id, [...msgs, { role: 'assistant', content: reply }], conv.draft, conv.stage); }
    return reply;
  } catch (e: any) { console.error('[BOT] Error:', e?.message); return 'Disculpa, tuve un problema. Intenta de nuevo.'; }
}
