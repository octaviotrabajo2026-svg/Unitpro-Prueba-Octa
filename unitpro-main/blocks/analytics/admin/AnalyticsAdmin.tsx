"use client";
// blocks/analytics/admin/AnalyticsAdmin.tsx
//
// SQL para crear las tablas requeridas en Supabase:
//
// -- CREATE TABLE IF NOT EXISTS page_views (
// --   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
// --   negocio_id integer REFERENCES negocios(id) ON DELETE CASCADE,
// --   path text NOT NULL,
// --   referrer text,
// --   user_agent text,
// --   created_at timestamptz DEFAULT now()
// -- );
// -- CREATE INDEX idx_page_views_negocio_date ON page_views(negocio_id, created_at DESC);
// --
// -- CREATE TABLE IF NOT EXISTS conversion_events (
// --   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
// --   negocio_id integer REFERENCES negocios(id) ON DELETE CASCADE,
// --   event_type text NOT NULL,
// --   metadata jsonb DEFAULT '{}',
// --   created_at timestamptz DEFAULT now()
// -- );
// -- CREATE INDEX idx_conversion_events_negocio_date ON conversion_events(negocio_id, created_at DESC);

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, Eye, TrendingUp, TrendingDown, Calendar,
  RefreshCw, Sparkles, Loader2, X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { useEditorMode } from '@/lib/hooks/useEditorMode';
import type { BlockAdminProps } from '@/types/blocks';

const PRIMARY = '#577a2c';
const REFRESH_INTERVAL_MS = 60_000;

const EVENT_LABELS: Record<string, string> = {
  booking: 'Reservas',
  contact: 'Contactos',
  whatsapp_click: 'Clicks WhatsApp',
  purchase: 'Compras',
};

interface PageView     { created_at: string; path: string; }
interface ConversionEvent { created_at: string; event_type: string; }

function buildLastNDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(0, 10);
  });
}

function groupByDay(rows: { created_at: string }[]): Record<string, number> {
  return rows.reduce((acc, row) => {
    const day = row.created_at.slice(0, 10);
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

export default function AnalyticsAdmin({ negocio }: BlockAdminProps) {
  const supabase    = createClient();
  const negocioId: number = negocio?.id;

  // ── Estado principal ───────────────────────────────────────────────────────
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [events,    setEvents]    = useState<ConversionEvent[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ── Easy/Pro mode ──────────────────────────────────────────────────────────
  const editorMode = useEditorMode();

  // ── Período (solo Pro) ─────────────────────────────────────────────────────
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  // ── IA ─────────────────────────────────────────────────────────────────────
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport,  setAiReport]  = useState<string | null>(null);
  const [aiError,   setAiError]   = useState<string | null>(null);

  // ── fetchData (respeta período seleccionado) ───────────────────────────────
  const fetchData = useCallback(async (days = period) => {
    if (!negocioId) return;
    setError(null);

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();

    try {
      const [pvRes, evRes] = await Promise.all([
        supabase.from('page_views').select('created_at, path')
          .eq('negocio_id', negocioId).gte('created_at', sinceIso),
        supabase.from('conversion_events').select('created_at, event_type')
          .eq('negocio_id', negocioId).gte('created_at', sinceIso),
      ]);

      if (pvRes.error) throw pvRes.error;
      if (evRes.error) throw evRes.error;

      setPageViews(pvRes.data ?? []);
      setEvents(evRes.data ?? []);
      setLastRefresh(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [negocioId, period]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Re-fetch cuando cambia el período — el useEffect que observa `fetchData`
  // (que a su vez depende de `period`) dispara el fetch automáticamente.
  const handlePeriodChange = (days: 7 | 30 | 90) => {
    setPeriod(days);
  };

  // ── Cálculos derivados ─────────────────────────────────────────────────────
  const lastNDays    = buildLastNDays(period);
  const last7Days    = buildLastNDays(7);
  const viewsByDay   = groupByDay(pageViews);
  const maxViews     = Math.max(...lastNDays.map(d => viewsByDay[d] ?? 0), 1);
  const activeDays   = lastNDays.filter(d => (viewsByDay[d] ?? 0) > 0).length;
  const totalViews   = pageViews.length;
  const totalConversions = events.length;
  const conversionRate   = totalViews > 0
    ? ((totalConversions / totalViews) * 100).toFixed(1) : '0.0';

  // Insight semanal (Easy mode)
  const thisWeekViews = last7Days.reduce((s, d) => s + (viewsByDay[d] ?? 0), 0);
  const prevWeekDays  = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 14 + i);
    return d.toISOString().slice(0, 10);
  });
  const prevWeekViews = prevWeekDays.reduce((s, d) => s + (viewsByDay[d] ?? 0), 0);
  const trendPct = prevWeekViews > 0
    ? Math.round(((thisWeekViews - prevWeekViews) / prevWeekViews) * 100)
    : thisWeekViews > 0 ? 100 : 0;
  const trendUp = trendPct >= 0;

  // Top 5 páginas — últimos 7 días
  const last7Views = pageViews.filter(pv => last7Days.includes(pv.created_at.slice(0, 10)));
  const pathCounts = last7Views.reduce((acc, pv) => {
    acc[pv.path] = (acc[pv.path] ?? 0) + 1; return acc;
  }, {} as Record<string, number>);
  const topPages = Object.entries(pathCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Conversiones por tipo
  const eventCounts  = events.reduce((acc, ev) => {
    acc[ev.event_type] = (acc[ev.event_type] ?? 0) + 1; return acc;
  }, {} as Record<string, number>);
  const eventEntries = Object.entries(eventCounts).sort((a, b) => b[1] - a[1]);

  const hasData = totalViews > 0 || totalConversions > 0;

  // ── Generar reporte con IA ─────────────────────────────────────────────────
  async function handleAiReport() {
    setAiLoading(true);
    setAiError(null);
    setAiReport(null);
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'campaign',
          negocioId,
          params: {
            businessName: negocio.nombre,
            campaignType: 'reactivation',
            clientSegment: `${totalViews} visitas, ${totalConversions} conversiones, ${conversionRate}% tasa de conversión en los últimos ${period} días`,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        const msg: string = data.error ?? '';
        if (msg.toLowerCase().includes('unitcoin') || msg.toLowerCase().includes('balance') || res.status === 402) {
          setAiError('Necesitás UnitCoins para usar esta función. Recargá desde Suscripción.');
        } else {
          setAiError('No se pudo generar el reporte. Intentá de nuevo.');
        }
      } else {
        setAiReport(data.result?.email_body ?? data.result?.whatsapp ?? JSON.stringify(data.result));
      }
    } catch {
      setAiError('Error de red. Verificá tu conexión.');
    } finally {
      setAiLoading(false);
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <RefreshCw size={24} className="animate-spin text-zinc-400" />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-in fade-in space-y-6">

      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart2 style={{ color: PRIMARY }} /> Analytics
          </h1>
          <p className="text-zinc-500 text-sm mt-0.5">
            Métricas de los últimos {period} días.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Selector de período — solo Pro */}
          {editorMode === 'pro' && (
            <div className="flex gap-1 bg-zinc-100 p-1 rounded-lg">
              {([7, 30, 90] as const).map(d => (
                <button
                  key={d}
                  onClick={() => handlePeriodChange(d)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    period === d
                      ? 'bg-white shadow-sm text-zinc-900'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => fetchData()}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
            title="Actualizar datos"
          >
            <RefreshCw size={14} />
            {lastRefresh.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!hasData ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
          <BarChart2 size={40} className="mx-auto text-zinc-200 mb-3" />
          <h3 className="text-lg font-bold text-zinc-900">Sin datos aún</h3>
          <p className="text-zinc-500 text-sm mt-1">
            Las métricas aparecerán cuando haya visitas en tu landing page.
          </p>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={<Eye size={18} />}       label="Total Vistas"    value={totalViews.toLocaleString('es-AR')} />
            <StatCard icon={<Calendar size={18} />}  label="Días activos"    value={`${activeDays} / ${period}`} />
            <StatCard icon={<TrendingUp size={18} />} label="Conversiones"   value={totalConversions.toLocaleString('es-AR')} />
            <StatCard icon={<BarChart2 size={18} />} label="Tasa de conv."   value={`${conversionRate}%`} />
          </div>

          {/* Insight semanal — Easy mode */}
          {editorMode === 'easy' && (thisWeekViews > 0 || prevWeekViews > 0) && (
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
              trendUp
                ? 'bg-green-50 border-green-200 text-green-800'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {trendUp
                ? <TrendingUp size={16} className="shrink-0" />
                : <TrendingDown size={16} className="shrink-0" />}
              Esta semana tuviste{' '}
              <strong>{Math.abs(trendPct)}% {trendUp ? 'más' : 'menos'}</strong>{' '}
              visitas que la semana pasada
              {prevWeekViews === 0 && trendUp && ' (primera semana con visitas)'}
            </div>
          )}

          {/* Bar chart */}
          <section className="bg-white rounded-2xl border border-zinc-200 p-5">
            <h2 className="text-sm font-semibold text-zinc-700 mb-4">
              Visitas diarias — últimos {period} días
            </h2>
            <div className="flex items-end gap-px h-32 w-full" aria-label="Gráfico de visitas diarias">
              {lastNDays.map(day => {
                const count = viewsByDay[day] ?? 0;
                const heightPct = Math.round((count / maxViews) * 100);
                return (
                  <div
                    key={day}
                    className="flex-1 flex flex-col items-center justify-end"
                    title={`${day}: ${count} visita${count !== 1 ? 's' : ''}`}
                  >
                    <div
                      className="w-full rounded-t-sm transition-all"
                      style={{ height: `${Math.max(heightPct, 2)}%`, backgroundColor: PRIMARY }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400 mt-1.5">
              <span>{lastNDays[0]}</span>
              <span>{lastNDays[lastNDays.length - 1]}</span>
            </div>
          </section>

          {/* Tablas + IA — solo Pro */}
          {editorMode === 'pro' && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Top pages */}
                <section className="bg-white rounded-2xl border border-zinc-200 p-5">
                  <h2 className="text-sm font-semibold text-zinc-700 mb-3">
                    Top páginas — últimos 7 días
                  </h2>
                  {topPages.length === 0 ? (
                    <p className="text-zinc-400 text-sm">Sin visitas en los últimos 7 días.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-zinc-400 border-b border-zinc-100">
                          <th className="pb-2 font-medium">Ruta</th>
                          <th className="pb-2 font-medium text-right">Visitas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topPages.map(([path, count]) => (
                          <tr key={path} className="border-b border-zinc-50 last:border-0">
                            <td className="py-2 text-zinc-700 truncate max-w-[180px]" title={path}>
                              {path || '/'}
                            </td>
                            <td className="py-2 text-right font-semibold" style={{ color: PRIMARY }}>
                              {count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>

                {/* Conversions by type */}
                <section className="bg-white rounded-2xl border border-zinc-200 p-5">
                  <h2 className="text-sm font-semibold text-zinc-700 mb-3">Conversiones por tipo</h2>
                  {eventEntries.length === 0 ? (
                    <p className="text-zinc-400 text-sm">Sin conversiones registradas aún.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-zinc-400 border-b border-zinc-100">
                          <th className="pb-2 font-medium">Evento</th>
                          <th className="pb-2 font-medium text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventEntries.map(([type, count]) => (
                          <tr key={type} className="border-b border-zinc-50 last:border-0">
                            <td className="py-2 text-zinc-700">{EVENT_LABELS[type] ?? type}</td>
                            <td className="py-2 text-right font-semibold" style={{ color: PRIMARY }}>
                              {count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </section>
              </div>

              {/* Botón IA */}
              <div className="flex flex-col items-end gap-3">
                <button
                  onClick={handleAiReport}
                  disabled={aiLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-60 transition-opacity"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {aiLoading
                    ? <Loader2 size={15} className="animate-spin" />
                    : <Sparkles size={15} />}
                  {aiLoading ? 'Generando...' : '✨ Generar reporte con IA'}
                </button>

                {/* Resultado IA */}
                {aiReport && (
                  <div className="w-full bg-zinc-50 border border-zinc-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm text-zinc-900 flex items-center gap-2">
                        <Sparkles size={14} style={{ color: PRIMARY }} /> Resumen IA
                      </h3>
                      <button
                        onClick={() => setAiReport(null)}
                        className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-lg transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-sm text-zinc-700 whitespace-pre-line leading-relaxed">
                      {aiReport}
                    </p>
                  </div>
                )}

                {/* Error IA */}
                {aiError && (
                  <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">⚠️</span>
                    <span>{aiError}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-componente StatCard ───────────────────────────────────────────────────
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col gap-2">
      <span className="text-zinc-400">{icon}</span>
      <p className="text-2xl font-bold text-zinc-900 leading-none">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}
