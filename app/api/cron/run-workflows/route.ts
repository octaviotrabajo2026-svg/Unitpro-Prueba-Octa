import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendWhatsAppNotification } from '@/lib/whatsapp-helper';
import { substituteTemplate } from '@/lib/workflows';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const results: any[] = [];

  try {
    // Load all enabled workflows with negocio data
    const { data: workflows, error: wfError } = await supabaseAdmin
      .from('automation_workflows')
      .select('*, negocios(id, nombre, whatsapp_access_token, config_web)')
      .eq('enabled', true);

    if (wfError) throw wfError;
    if (!workflows || workflows.length === 0) {
      return NextResponse.json({ message: 'No active workflows', processed: 0 });
    }

    for (const wf of workflows) {
      const negocio = wf.negocios;
      if (!negocio) continue;
      const instanceName = negocio.whatsapp_access_token;
      const msgTemplate = wf.config?.message || '';
      let processed = 0, sent = 0, errors = 0;

      try {
        switch (wf.recipe_id) {

          case 'reminder_24h': {
            // Turnos confirmed between now+23h and now+25h, not yet reminded
            const from = new Date(now.getTime() + 23 * 3600_000).toISOString();
            const to   = new Date(now.getTime() + 25 * 3600_000).toISOString();

            const { data: turnos } = await supabaseAdmin
              .from('turnos')
              .select('id, cliente_nombre, cliente_telefono, fecha_inicio, servicio')
              .eq('negocio_id', negocio.id)
              .eq('estado', 'confirmado')
              .eq('recordatorio_enviado', false)
              .gte('fecha_inicio', from)
              .lte('fecha_inicio', to);

            for (const t of turnos ?? []) {
              processed++;
              if (!t.cliente_telefono || !instanceName) { errors++; continue; }
              const fechaObj = new Date(t.fecha_inicio);
              const msg = substituteTemplate(msgTemplate, {
                nombre: t.cliente_nombre || 'Cliente',
                fecha: fechaObj.toLocaleDateString('es-AR'),
                hora: fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
                negocio: negocio.nombre,
              });
              const res = await sendWhatsAppNotification(
                t.cliente_telefono, 'reminder', {}, instanceName, msg
              );
              if (res.success) {
                sent++;
                const { error: updateErr } = await supabaseAdmin.from('turnos').update({ recordatorio_enviado: true }).eq('id', t.id);
                if (updateErr) console.error('[cron] failed to mark turno', t.id, updateErr.message);
              } else { errors++; }
            }
            break;
          }

          case 'post_visit_review': {
            // Turnos completed between now-3h and now-1h
            const from = new Date(now.getTime() - 3 * 3600_000).toISOString();
            const to   = new Date(now.getTime() - 1 * 3600_000).toISOString();

            const { data: turnos } = await supabaseAdmin
              .from('turnos')
              .select('id, cliente_nombre, cliente_telefono, fecha_inicio, servicio, metadata')
              .eq('negocio_id', negocio.id)
              .eq('estado', 'completado')
              .gte('fecha_inicio', from)
              .lte('fecha_inicio', to);

            for (const t of turnos ?? []) {
              processed++;
              if (!t.cliente_telefono || !instanceName) { errors++; continue; }
              // Check if review was already sent via metadata flag
              if (t.metadata?.review_sent) continue;

              const configWeb = typeof negocio.config_web === 'string'
                ? JSON.parse(negocio.config_web) : (negocio.config_web || {});
              const landingSlug = configWeb.slug || negocio.id;
              const reviewLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://unitpro.ar'}/${landingSlug}#resenas`;

              const msg = substituteTemplate(msgTemplate, {
                nombre: t.cliente_nombre || 'Cliente',
                link_resena: reviewLink,
                negocio: negocio.nombre,
              });
              const res = await sendWhatsAppNotification(
                t.cliente_telefono, 'review_request', {}, instanceName, msg
              );
              if (res.success) {
                sent++;
                const { error: updateErr } = await supabaseAdmin.from('turnos').update({
                  metadata: { ...(t.metadata || {}), review_sent: true }
                }).eq('id', t.id);
                if (updateErr) console.error('[cron] failed to mark review_sent on turno', t.id, updateErr.message);
              } else { errors++; }
            }
            break;
          }

          case 'inactive_client': {
            // Find unique client emails whose LATEST turno was > N days ago
            const diasSinTurno = wf.config?.diasSinTurno ?? 45;
            const cutoff = new Date(now.getTime() - diasSinTurno * 86400_000).toISOString();

            // Get all clients with at least one turno, ordered by most recent first
            const { data: rows } = await supabaseAdmin
              .from('turnos')
              .select('cliente_email, cliente_nombre, cliente_telefono, fecha_inicio')
              .eq('negocio_id', negocio.id)
              .order('fecha_inicio', { ascending: false });

            // Deduplicate by email — keep only the most recent turno per client
            const seenEmails = new Map<string, any>();
            for (const clientRow of rows ?? []) {
              if (!clientRow.cliente_email) continue;
              if (!seenEmails.has(clientRow.cliente_email)) {
                seenEmails.set(clientRow.cliente_email, clientRow);
              }
            }

            // Filter: last turno was before the cutoff
            for (const [, t] of seenEmails) {
              if (!t.fecha_inicio || new Date(t.fecha_inicio) > new Date(cutoff)) continue;
              processed++;
              if (!t.cliente_telefono || !instanceName) { errors++; continue; }

              const msg = substituteTemplate(msgTemplate, {
                nombre: t.cliente_nombre || 'Cliente',
                negocio: negocio.nombre,
              });
              const res = await sendWhatsAppNotification(
                t.cliente_telefono, 'reactivation', {}, instanceName, msg
              );
              if (res.success) sent++; else errors++;
            }
            break;
          }

          case 'birthday_discount': {
            // Find clients whose birthday is today (MM-DD match)
            const today = now.toISOString().slice(5, 10); // MM-DD

            const { data: rows } = await supabaseAdmin
              .from('turnos')
              .select('cliente_email, cliente_nombre, cliente_telefono, metadata')
              .eq('negocio_id', negocio.id)
              .not('metadata->birthday', 'is', null);

            const sentToday = new Set<string>();
            for (const t of rows ?? []) {
              if (!t.metadata?.birthday || sentToday.has(t.cliente_email)) continue;
              const bday = String(t.metadata.birthday).slice(5, 10); // MM-DD from stored date
              if (bday !== today) continue;
              processed++;
              sentToday.add(t.cliente_email);
              if (!t.cliente_telefono || !instanceName) { errors++; continue; }
              const msg = substituteTemplate(msgTemplate, {
                nombre: t.cliente_nombre || 'Cliente',
                negocio: negocio.nombre,
              });
              const res = await sendWhatsAppNotification(
                t.cliente_telefono, 'birthday', {}, instanceName, msg
              );
              if (res.success) sent++; else errors++;
            }
            break;
          }

          // owner_notification is triggered in real-time on turno creation, not via cron
          case 'owner_notification':
            break;
        }

        // Update execution count and last_run timestamp
        const { error: wfUpdateErr } = await supabaseAdmin.from('automation_workflows').update({
          executions: (wf.executions ?? 0) + (sent > 0 ? 1 : 0),
          last_run: now.toISOString(),
        }).eq('id', wf.id);
        if (wfUpdateErr) console.error('[cron] failed to update workflow stats', wf.id, wfUpdateErr.message);

        results.push({ workflowId: wf.id, recipeId: wf.recipe_id, negocioId: negocio.id, processed, sent, errors });

      } catch (wfErr: any) {
        console.error(`[run-workflows] Error in workflow ${wf.id}:`, wfErr);
        results.push({ workflowId: wf.id, recipeId: wf.recipe_id, error: wfErr.message });
      }
    }

    const totalSent = results.reduce((s, r) => s + (r.sent ?? 0), 0);
    return NextResponse.json({ ok: true, workflows: results.length, totalSent, results });

  } catch (err: any) {
    console.error('[run-workflows] Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
