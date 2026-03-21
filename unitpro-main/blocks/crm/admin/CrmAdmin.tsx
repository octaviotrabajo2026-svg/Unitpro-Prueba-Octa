"use client";
// blocks/crm/admin/CrmAdmin.tsx

// -- CREATE TABLE IF NOT EXISTS crm_pipeline (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   negocio_id integer REFERENCES negocios(id) ON DELETE CASCADE,
//   client_email text NOT NULL, client_name text,
//   stage text DEFAULT 'lead',
//   notes text, value numeric(10,2) DEFAULT 0,
//   last_activity timestamptz DEFAULT now(),
//   metadata jsonb DEFAULT '{}',
//   created_at timestamptz DEFAULT now()
// );

import { useState, useEffect } from "react";
import {
  Users, Phone, Mail, Briefcase, Calendar,
  ChevronDown, ChevronUp, MessageCircle, Search,
  Plus, X, DollarSign, Clock,
} from "lucide-react";
import type { BlockAdminProps } from "@/types/blocks";
import { createClient } from "@/lib/supabase";
import { useEditorMode } from "@/lib/hooks/useEditorMode";

const PRIMARY = "#577a2c";

interface PipelineLead {
  id: string;
  negocio_id: number;
  client_email: string;
  client_name: string | null;
  stage: 'lead' | 'contacted' | 'client' | 'recurrent' | 'inactive';
  notes: string | null;
  value: number;
  last_activity: string;
  created_at: string;
}

export default function CrmAdmin({ negocio, sharedData }: BlockAdminProps) {
  const { turnos, openContactModal } = sharedData;

  // ── Existing "Clientes" state ──
  const [search,       setSearch]       = useState("");
  const [filtroWorker, setFiltroWorker] = useState("Todos");
  const [expandedId,   setExpandedId]   = useState<string | null>(null);

  // ── New Pipeline state ──
  const [activeTab,    setActiveTab]    = useState<'clientes' | 'pipeline'>('clientes');
  const [leads,        setLeads]        = useState<PipelineLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [draggedId,    setDraggedId]    = useState<string | null>(null);
  const [showAddLead,  setShowAddLead]  = useState(false);
  const [newLead,      setNewLead]      = useState<{
    client_name: string;
    client_email: string;
    stage: PipelineLead['stage'];
    value: string;
    notes: string;
  }>({
    client_name: '',
    client_email: '',
    stage: 'lead',
    value: '',
    notes: '',
  });
  // Read editorMode from localStorage via shared hook
  const editorMode = useEditorMode();

  useEffect(() => {
    if (activeTab === 'pipeline') loadLeads();
  }, [activeTab, negocio.id]);

  // ── Kanban stage definitions ──
  const EASY_STAGES = [
    { id: 'lead',      label: '🎯 Lead',        color: 'bg-zinc-100 border-zinc-200'    },
    { id: 'contacted', label: '📞 Contactado',   color: 'bg-blue-50 border-blue-200'    },
    { id: 'client',    label: '✅ Cliente',       color: 'bg-green-50 border-green-200'  },
  ];

  const PRO_STAGES = [
    { id: 'lead',      label: '🎯 Lead',        color: 'bg-zinc-100 border-zinc-200'      },
    { id: 'contacted', label: '📞 Contactado',   color: 'bg-blue-50 border-blue-200'      },
    { id: 'client',    label: '✅ Cliente',       color: 'bg-green-50 border-green-200'    },
    { id: 'recurrent', label: '🔄 Recurrente',   color: 'bg-emerald-50 border-emerald-200'},
    { id: 'inactive',  label: '💤 Inactivo',     color: 'bg-zinc-50 border-zinc-300'      },
  ];

  const stages = editorMode === 'pro' ? PRO_STAGES : EASY_STAGES;

  // ── Pipeline functions ──

  /** Fetches all pipeline leads for this negocio from Supabase. */
  async function loadLeads() {
    setLoadingLeads(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('crm_pipeline')
      .select('*')
      .eq('negocio_id', negocio.id)
      .order('last_activity', { ascending: false });
    setLeads(data ?? []);
    setLoadingLeads(false);
  }

  function handleDragStart(e: React.DragEvent, leadId: string) {
    setDraggedId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  /** Persists the stage change when a card is dropped on a column. */
  async function handleDrop(e: React.DragEvent, targetStage: PipelineLead['stage']) {
    e.preventDefault();
    if (!draggedId) return;
    const supabase = createClient();
    await supabase.from('crm_pipeline')
      .update({ stage: targetStage, last_activity: new Date().toISOString() })
      .eq('id', draggedId)
      .eq('negocio_id', negocio.id);
    setLeads(prev => prev.map(l => l.id === draggedId ? { ...l, stage: targetStage } : l));
    setDraggedId(null);
  }

  /** Inserts a new lead and prepends it to the local list. */
  async function addLead() {
    if (!newLead.client_email) return;
    const supabase = createClient();
    const { data, error } = await supabase.from('crm_pipeline').insert({
      negocio_id: negocio.id,
      client_email: newLead.client_email,
      client_name: newLead.client_name || null,
      stage: newLead.stage,
      value: parseFloat(newLead.value) || 0,
      notes: newLead.notes || null,
    }).select().single();
    if (!error && data) {
      setLeads(prev => [data, ...prev]);
      setShowAddLead(false);
      setNewLead({ client_name: '', client_email: '', stage: 'lead', value: '', notes: '' });
    }
  }

  // ── Existing "Clientes" helpers ──
  const toggle = (id: string) => setExpandedId(prev => prev === id ? null : id);

  const equipo       = negocio?.config_web?.equipo?.items || negocio?.config_web?.equipo?.members || [];
  const trabajadores: string[] = equipo.map((m: any) => m.nombre || m.name).filter(Boolean);

  // Deduplicar por email (mismo algoritmo que el legacy)
  const clientesDedup = turnos.filter((obj: any, idx: number, self: any[]) =>
    idx === self.findIndex((t: any) =>
      t.cliente_email?.trim().toLowerCase() === obj.cliente_email?.trim().toLowerCase() && t.cliente_email
    )
  );

  const filtradosPorWorker = filtroWorker === "Todos"
    ? clientesDedup
    : clientesDedup.filter((t: any) => {
        const fromSvc = typeof t.servicio === "string" && t.servicio.includes(" - ")
          ? t.servicio.split(" - ")[1]?.trim()
          : "";
        return (t.worker_name?.trim() || fromSvc) === filtroWorker;
      });

  const q = search.toLowerCase();
  const clientes = q === ""
    ? filtradosPorWorker
    : filtradosPorWorker.filter((t: any) =>
        (t.cliente_nombre   || "").toLowerCase().includes(q) ||
        (t.cliente_email    || "").toLowerCase().includes(q) ||
        (t.cliente_telefono || "").toLowerCase().includes(q) ||
        (t.servicio         || "").toLowerCase().includes(q)
      );

  const fmtFecha = (iso: string) => {
    if (!iso) return "Sin fecha";
    try {
      const [fecha, hora] = iso.split("T");
      return `${fecha.split("-").reverse().join("/")} - ${hora?.slice(0, 5) ?? ""}`;
    } catch { return iso; }
  };

  const waLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

  // ── Render ──
  return (
    <div className="animate-in fade-in space-y-5">

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl w-fit mb-5">
        {(['clientes', 'pipeline'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'
            }`}>
            {tab === 'clientes' ? 'Clientes' : 'Pipeline'}
          </button>
        ))}
      </div>

      {/* ── Clientes tab ── */}
      {activeTab === 'clientes' && (
        <>
          <header>
            <h1 className="text-2xl font-bold">Base de Clientes</h1>
            <p className="text-zinc-500 text-sm">{clientesDedup.length} clientes únicos registrados.</p>
          </header>

          {/* Buscador + filtro trabajador */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                placeholder="Buscar por nombre, email, teléfono o servicio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900 bg-white"
              />
            </div>
            {trabajadores.length > 0 && (
              <select
                value={filtroWorker}
                onChange={e => setFiltroWorker(e.target.value)}
                className="px-3 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none bg-white text-zinc-700 focus:ring-2 focus:ring-[#577a2c]/30"
              >
                <option value="Todos">Todos los profesionales</option>
                {trabajadores.map((w: string) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            )}
          </div>

          {clientes.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
              <Users size={40} className="mx-auto text-zinc-200 mb-3" />
              <p className="text-zinc-400 text-sm">
                {search || filtroWorker !== "Todos"
                  ? "No hay clientes que coincidan con la búsqueda."
                  : "No hay clientes registrados aún."}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">

              {/* ── Desktop ── */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50/50 border-b border-zinc-100">
                    <tr>
                      {["Nombre", "Teléfono", "Email", "Servicio", "Último Turno", ""].map(h => (
                        <th key={h} className="px-6 py-4 font-semibold text-zinc-500 text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {clientes.map((c: any) => (
                      <tr key={c.id} className="group hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4 font-bold text-zinc-900">{c.cliente_nombre}</td>
                        <td className="px-6 py-4 font-mono text-zinc-600">{c.cliente_telefono || "Sin teléfono"}</td>
                        <td className="px-6 py-4 text-zinc-500">{c.cliente_email}</td>
                        <td className="px-6 py-4 text-zinc-500 max-w-[180px] truncate">{c.servicio || "General"}</td>
                        <td className="px-6 py-4 font-mono text-zinc-600 text-xs">{fmtFecha(c.fecha_inicio)}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            {c.cliente_telefono && (
                              <a href={waLink(c.cliente_telefono)} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-bold text-xs">
                                <MessageCircle size={14} /> WhatsApp
                              </a>
                            )}
                            {openContactModal && (
                              <button onClick={() => openContactModal(c.cliente_email, c.cliente_nombre)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-bold text-xs">
                                <Mail size={14} /> Email
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Móvil (cards expandibles) ── */}
              <div className="lg:hidden divide-y divide-zinc-100">
                {clientes.map((c: any) => (
                  <div key={c.id} className="flex flex-col">
                    <div onClick={() => toggle(c.id)}
                      className="p-4 flex items-center justify-between active:bg-zinc-50 cursor-pointer">
                      <div>
                        <span className="font-bold text-zinc-900 block">{c.cliente_nombre}</span>
                        <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                          <Phone size={12} className="text-zinc-400" />
                          {c.cliente_telefono || "Sin teléfono"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {c.cliente_telefono && (
                          <a href={waLink(c.cliente_telefono)} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-full">
                            <MessageCircle size={14} />
                          </a>
                        )}
                        <span className="text-zinc-400">
                          {expandedId === c.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </span>
                      </div>
                    </div>

                    {expandedId === c.id && (
                      <div className="px-4 pb-4 pt-2 bg-zinc-50/50 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-3 border-t border-zinc-100 pt-3">
                          <div className="flex items-center gap-3 text-sm">
                            <Mail size={16} className="text-zinc-400 shrink-0" />
                            <span className="text-zinc-600 truncate">{c.cliente_email}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <Briefcase size={16} className="text-zinc-400 shrink-0" />
                            <span className="text-zinc-600">{c.servicio || "General"}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <Calendar size={16} className="text-zinc-400 shrink-0" />
                            <span className="text-zinc-600 font-mono text-xs">Último: {fmtFecha(c.fecha_inicio)}</span>
                          </div>
                          {openContactModal && (
                            <button
                              onClick={e => { e.stopPropagation(); openContactModal(c.cliente_email, c.cliente_nombre); }}
                              className="w-full mt-2 flex items-center justify-center gap-2 py-3 text-white rounded-xl font-bold text-sm"
                              style={{ backgroundColor: PRIMARY }}>
                              <Mail size={16} /> Enviar Email Profesional
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Pipeline tab ── */}
      {activeTab === 'pipeline' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-lg">Pipeline de ventas</h2>
              <p className="text-zinc-500 text-sm">{leads.length} contactos</p>
            </div>
            <button onClick={() => setShowAddLead(true)}
              className="flex items-center gap-2 px-4 py-2 text-white text-sm font-bold rounded-xl"
              style={{ backgroundColor: '#577a2c' }}>
              <Plus size={16} /> Agregar lead
            </button>
          </div>

          {/* Kanban board — horizontal scroll on mobile */}
          <div className="flex gap-3 overflow-x-auto pb-4">
            {stages.map(col => {
              const colLeads = leads.filter(l => l.stage === col.id);
              return (
                <div key={col.id}
                  className={`flex-shrink-0 w-64 rounded-xl border p-3 ${col.color}`}
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, col.id as PipelineLead['stage'])}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-zinc-700">{col.label}</span>
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full text-zinc-500 font-medium">{colLeads.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[100px]">
                    {colLeads.map(lead => (
                      <div key={lead.id}
                        draggable
                        onDragStart={e => handleDragStart(e, lead.id)}
                        className={`bg-white rounded-lg p-3 shadow-sm border border-zinc-100 cursor-grab active:cursor-grabbing transition-opacity ${
                          draggedId === lead.id ? 'opacity-40' : ''
                        }`}>
                        <p className="font-bold text-sm text-zinc-900 truncate">{lead.client_name || lead.client_email}</p>
                        <p className="text-xs text-zinc-400 truncate">{lead.client_email}</p>
                        {(editorMode === 'pro' || lead.value > 0) && lead.value > 0 && (
                          <p className="text-xs font-bold mt-1" style={{ color: '#577a2c' }}>${lead.value.toLocaleString()}</p>
                        )}
                        <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                          <Clock size={10} />
                          {Math.floor((Date.now() - new Date(lead.last_activity).getTime()) / 86400000)}d
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {leads.length === 0 && !loadingLeads && (
            <div className="text-center py-12 text-zinc-400">
              <p className="text-sm">Aún no hay leads. ¡Agregá el primero!</p>
            </div>
          )}
        </div>
      )}

      {/* Add Lead modal */}
      {showAddLead && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Agregar lead</h3>
              <button onClick={() => setShowAddLead(false)} className="p-1 hover:bg-zinc-100 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Nombre</label>
                <input type="text" value={newLead.client_name}
                  onChange={e => setNewLead(p => ({ ...p, client_name: e.target.value }))}
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30"
                  placeholder="Nombre del lead" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Email *</label>
                <input type="email" value={newLead.client_email}
                  onChange={e => setNewLead(p => ({ ...p, client_email: e.target.value }))}
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30"
                  placeholder="email@ejemplo.com" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Etapa inicial</label>
                <select value={newLead.stage}
                  onChange={e => setNewLead(p => ({ ...p, stage: e.target.value as PipelineLead['stage'] }))}
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-[#577a2c]/30">
                  {stages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              {editorMode === 'pro' && (
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Valor estimado ($)</label>
                  <input type="number" value={newLead.value}
                    onChange={e => setNewLead(p => ({ ...p, value: e.target.value }))}
                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30"
                    placeholder="0" />
                </div>
              )}
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">Notas</label>
                <textarea value={newLead.notes}
                  onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-[#577a2c]/30"
                  placeholder="Observaciones..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowAddLead(false)} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900">Cancelar</button>
              <button onClick={addLead}
                className="px-4 py-2 text-sm font-bold text-white rounded-xl"
                style={{ backgroundColor: '#577a2c' }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
