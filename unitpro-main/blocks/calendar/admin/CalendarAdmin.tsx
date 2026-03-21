"use client";
// blocks/calendar/admin/CalendarAdmin.tsx
//
// Sub-tabs:
//   1. Calendario  — vista semanal idéntica al legacy (colores semáforo, menú 3 puntos, filtro por profesional)
//   2. Gestión     — ManualBookingManager + BlockTimeManager
//   3. Promociones — lista + formulario (idéntico al PromotionsTab del legacy)

import { useState }              from "react";
import {
  ChevronLeft, ChevronRight, Clock, User, Eye, EyeOff,
  Mail, Phone, MoreVertical, Edit, Trash2, ExternalLink,
  Link as LinkIcon, CalendarDays, X, Minus, Plus, Tag,
  Check, Loader2,
} from "lucide-react";
import { createClient }          from "@/lib/supabase";
import { cancelAppointment }     from "@/app/actions/confirm-booking/manage-appointment";
import ManualBookingManager      from "@/components/dashboards/ManualBookingManager";
import BlockTimeManager          from "@/components/dashboards/BlockTimeManager";
import type { BlockAdminProps }  from "@/types/blocks";

const PRIMARY = "#577a2c";
type SubTab = "calendario" | "gestion" | "promociones";

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function CalendarAdmin({ negocio, sharedData }: BlockAdminProps) {
  const [subTab, setSubTab] = useState<SubTab>("calendario");
  const sub: { id: SubTab; label: string }[] = [
    { id: "calendario",  label: "Calendario" },
    { id: "gestion",     label: "Gestión de Turnos" },
    { id: "promociones", label: "Promociones" },
  ];
  return (
    <div className="animate-in fade-in space-y-6">
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        {sub.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === t.id ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {subTab === "calendario"  && <CalendarioTab  negocio={negocio} sharedData={sharedData} />}
      {subTab === "gestion"     && <GestionTab     negocio={negocio} />}
      {subTab === "promociones" && <PromocionesTab negocio={negocio} />}
    </div>
  );
}

// ─── 1. Calendario semanal ────────────────────────────────────────────────────
function CalendarioTab({ negocio, sharedData }: { negocio: any; sharedData: any }) {
  const { turnos, fetchData, handleConnectGoogle, openContactModal, openRescheduleModal } = sharedData;

  const [currentDate, setCurrentDate]   = useState(new Date());
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos]           = useState({ top: 0, left: 0 });
  const [detailsModal, setDetailsModal] = useState<{ show: boolean; data: any }>({ show: false, data: null });
  const [filtro, setFiltro]             = useState("Todos");

  const equipo       = negocio.config_web?.equipo?.members || negocio.config_web?.equipo?.items || [];
  const trabajadores = equipo.map((m: any) => m.name || m.nombre).filter(Boolean);

  const pasaFiltro = (t: any) => {
    if (filtro === "Todos") return true;
    const fromSvc = typeof t.servicio === "string" && t.servicio.includes(" - ") ? t.servicio.split(" - ")[1].trim() : "";
    return (t.worker_name?.trim() || fromSvc) === filtro;
  };

  const getDays = (date: Date) => {
    const d   = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(d); x.setDate(d.getDate() + i); return x;
    });
  };

  const days    = getDays(currentDate);
  const isToday = (d: Date) => {
    const n = new Date();
    return d.getDate() === n.getDate() && d.getMonth() === n.getMonth();
  };

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    if (activeMenuId === id) { setActiveMenuId(null); return; }
    const r  = e.currentTarget.getBoundingClientRect();
    let left = r.left; if (left + 210 > window.innerWidth - 20) left = r.right - 210;
    let top  = r.bottom + 5; if (top + 230 > window.innerHeight) top = r.top - 230 - 5;
    setMenuPos({ top, left }); setActiveMenuId(id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Cancelar este turno? Se eliminará de Google Calendar.")) return;
    const res = await cancelAppointment(id);
    if (res.success) await fetchData();
    else alert("Error: " + res.error);
    setActiveMenuId(null);
  };

  if (!negocio.google_calendar_connected) return (
    <div className="h-[500px] flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-zinc-300 text-center p-8">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 text-white" style={{ backgroundColor: PRIMARY }}>
        <CalendarDays size={40} />
      </div>
      <h2 className="text-2xl font-bold text-zinc-900 mb-2">Conectá tu Calendario</h2>
      <p className="text-zinc-500 max-w-md mb-8">Para ver y gestionar tus turnos, sincronizá con Google Calendar.</p>
      <button onClick={handleConnectGoogle}
        className="text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg"
        style={{ backgroundColor: PRIMARY }}>
        <LinkIcon size={18} /> Conectar con Google
      </button>
    </div>
  );

  return (
    <div className="h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Tu Calendario</h2>
          <p className="text-zinc-500 text-sm">Gestioná tus turnos de la semana.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {trabajadores.length > 0 && (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-zinc-200 shadow-sm">
              <label className="text-xs font-bold text-zinc-500 uppercase">Profesional:</label>
              <select value={filtro} onChange={e => setFiltro(e.target.value)}
                className="bg-transparent text-sm font-bold outline-none cursor-pointer"
                style={{ color: PRIMARY }}>
                <option value="Todos">Todos</option>
                {trabajadores.map((n: string, i: number) => <option key={i} value={n}>{n}</option>)}
              </select>
            </div>
          )}
          <div className="flex items-center gap-4 bg-white p-1 rounded-xl border border-zinc-200 shadow-sm">
            <button
              onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - 7); setCurrentDate(d); }}
              className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600"><ChevronLeft size={20} /></button>
            <span className="text-sm font-bold min-w-[140px] text-center capitalize">
              {days[0].toLocaleDateString("es-AR", { month: "long", day: "numeric" })} - {days[6].toLocaleDateString("es-AR", { month: "long", day: "numeric" })}
            </span>
            <button
              onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + 7); setCurrentDate(d); }}
              className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      {/* Grilla */}
      <div className="flex-1 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
        {/* Cabecera días — solo desktop */}
        <div className="hidden lg:grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
          {days.map((day, i) => (
            <div key={i} className={`py-4 text-center border-r border-zinc-100 last:border-0 ${isToday(day) ? "bg-blue-50/50" : ""}`}>
              <p className="text-xs font-bold text-zinc-400 uppercase mb-1">
                {day.toLocaleDateString("es-AR", { weekday: "short" })}
              </p>
              <div className={`text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isToday(day) ? "bg-blue-600 text-white shadow-md" : "text-zinc-900"}`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        {/* Columnas con turnos */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-7 overflow-y-auto min-h-[400px] pb-16">
          {days.map((day, i) => {
            const dayTurnos = turnos
              .filter((t: any) => {
                const d = new Date(t.fecha_inicio);
                return d.getDate() === day.getDate() && d.getMonth() === day.getMonth()
                  && d.getFullYear() === day.getFullYear() && pasaFiltro(t);
              })
              .sort((a: any, b: any) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime());

            return (
              <div key={i} className={`border-r border-zinc-100 last:border-0 p-2 space-y-2 ${isToday(day) ? "bg-blue-50/10" : ""}`}>
                {/* Etiqueta día móvil */}
                <div className={`lg:hidden flex items-center gap-2 py-2 px-2 mb-2 rounded-lg ${isToday(day) ? "bg-blue-50 text-blue-700" : "bg-zinc-50 text-zinc-600"}`}>
                  <span className="font-bold text-sm capitalize">
                    {day.toLocaleDateString("es-AR", { weekday: "long" })}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isToday(day) ? "bg-blue-200" : "bg-zinc-200"}`}>
                    {day.getDate()}
                  </span>
                </div>

                {dayTurnos.length === 0 && (
                  <div className="md:hidden text-center py-4 text-xs text-zinc-300 italic">Sin actividad</div>
                )}

                {dayTurnos.map((t: any) => {
                  // Colores semáforo idénticos al legacy
                  const s = t.estado === "pendiente"
                    ? { border: "border-l-red-500",     bg: "bg-red-50",     text: "text-red-700" }
                    : t.estado === "esperando_senia"
                    ? { border: "border-l-yellow-400",  bg: "bg-yellow-50",  text: "text-yellow-700" }
                    : { border: "border-l-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" };

                  return (
                    <div key={t.id}
                      className={`bg-white p-3 rounded-lg border border-zinc-200 shadow-sm relative border-l-4 hover:shadow-md transition-all ${s.border}`}>
                      {/* Header tarjeta */}
                      <div className={`flex justify-between items-start mb-2 p-1.5 rounded ${s.bg} ${s.text}`}>
                        <p className="text-[11px] font-bold flex flex-wrap items-center gap-1 leading-tight">
                          <Clock size={12} className="shrink-0" />
                          {new Date(t.fecha_inicio).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                          {t.fecha_fin && (
                            <span className="font-medium opacity-80">
                              {" - "}{new Date(t.fecha_fin).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </p>
                        <button onClick={e => openMenu(e, t.id)} className="hover:bg-white/50 p-0.5 rounded transition-colors">
                          <MoreVertical size={14} />
                        </button>
                      </div>

                      {/* Menú desplegable */}
                      {activeMenuId === t.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                          <div className="fixed z-50 bg-white rounded-lg shadow-xl border border-zinc-100 py-1 w-52 animate-in fade-in zoom-in-95 duration-100"
                            style={{ top: menuPos.top, left: menuPos.left }}>
                            {(t.mensaje || t.fotos?.length > 0) && (
                              <button onClick={() => { setDetailsModal({ show: true, data: t }); setActiveMenuId(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-blue-600 flex items-center gap-2 border-b border-zinc-50">
                                <Eye size={14} /> Ver Solicitud
                              </button>
                            )}
                            <button
                              onClick={() => { openRescheduleModal(t.id, t.fecha_inicio); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-indigo-600 flex items-center gap-2">
                              <Edit size={14} /> Reprogramar
                            </button>
                            <button
                              onClick={() => { openContactModal(t.cliente_email, t.cliente_nombre); setActiveMenuId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-emerald-600 flex items-center gap-2">
                              <Mail size={14} /> Email
                            </button>
                            {t.cliente_telefono && (
                              <a href={`https://wa.me/${t.cliente_telefono.replace(/\D/g, "")}`}
                                target="_blank" rel="noopener noreferrer"
                                className="block w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-green-600 flex items-center gap-2">
                                <Phone size={14} /> WhatsApp
                              </a>
                            )}
                            <div className="h-px bg-zinc-100 my-1" />
                            <button onClick={() => handleDelete(t.id)}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                              <Trash2 size={14} /> Cancelar Turno
                            </button>
                          </div>
                        </>
                      )}

                      <p className="text-sm font-bold text-zinc-900 truncate pr-1">{t.cliente_nombre}</p>
                      <p className="text-xs font-medium text-zinc-700 truncate mt-1">
                        {typeof t.servicio === "string"
                          ? (t.servicio.includes(" - ") ? t.servicio.split(" - ")[0] : t.servicio)
                          : (t.servicio?.titulo || t.servicio?.name || "Servicio")}
                      </p>
                      {(t.worker_name || (typeof t.servicio === "string" && t.servicio.includes(" - "))) && (
                        <p className="text-[10px] text-zinc-400 flex items-center gap-1 truncate mt-0.5">
                          <User size={10} />
                          {t.worker_name || t.servicio.split(" - ")[1]}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal detalles de solicitud */}
      {detailsModal.show && detailsModal.data && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setDetailsModal({ show: false, data: null })}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:bg-zinc-100 rounded-full">
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-1">Detalles de la Solicitud</h3>
            <p className="text-sm text-zinc-500 mb-6">Información de {detailsModal.data.cliente_nombre}</p>
            <div className="space-y-4">
              {detailsModal.data.mensaje && (
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase block mb-2">Mensaje</label>
                  <div className="bg-zinc-50 p-4 rounded-xl border italic text-zinc-600 text-sm">
                    "{detailsModal.data.mensaje}"
                  </div>
                </div>
              )}
              {detailsModal.data.fotos?.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-zinc-400 uppercase block mb-2">
                    Adjuntos ({detailsModal.data.fotos.length})
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {detailsModal.data.fotos.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                        className="aspect-square rounded-lg overflow-hidden border hover:ring-2 hover:ring-indigo-500 transition-all group relative">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                          <ExternalLink size={16} className="text-white opacity-0 group-hover:opacity-100" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setDetailsModal({ show: false, data: null })}
              className="mt-6 w-full py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-colors">
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 2. Gestión de Turnos ─────────────────────────────────────────────────────
function GestionTab({ negocio }: { negocio: any }) {
  const workers  = negocio.config_web?.equipo?.members || negocio.config_web?.equipo?.items || [];
  const services = [
    ...(negocio.config_web?.servicios?.items?.map((s: any) => ({ ...s, name: s.titulo })) || []),
    ...(negocio.config_web?.services || []),
  ];
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-xl font-bold">Gestión de Turnos y Horarios</h2>
        <p className="text-zinc-500 text-sm">Agendá turnos manuales o bloqueá horarios por feriados/vacaciones.</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <ManualBookingManager slug={negocio.slug} workers={workers} services={services} />
        <BlockTimeManager     slug={negocio.slug} workers={workers} />
      </div>
    </div>
  );
}

// ─── 3. Promociones — idéntico al PromotionsTab del legacy ────────────────────
function PromocionesTab({ negocio }: { negocio: any }) {
  const supabase   = createClient();
  const [config, setConfig]     = useState(negocio.config_web || { services: [] });
  const [saving, setSaving]     = useState(false);
  const [newPromo, setNewPromo] = useState({
    name: "", description: "", price: "", duration: "60",
    isPromo: true, promoEndDate: "", workerIds: [] as string[],
  });

  const promos = (config.services || []).filter((s: any) => s.isPromo);

  const handleSave = async (updated: any[]) => {
    setSaving(true);
    const newConfig = { ...config, services: updated };
    const { error } = await supabase.from("negocios").update({ config_web: newConfig }).eq("id", negocio.id);
    if (error) alert("Error: " + error.message);
    else {
      setConfig(newConfig);
      setNewPromo({ name: "", description: "", price: "", duration: "60", isPromo: true, promoEndDate: "", workerIds: [] });
    }
    setSaving(false);
  };

  const handleAdd = () => {
    if (!newPromo.name || !newPromo.price || !newPromo.promoEndDate) {
      alert("Completá nombre, precio y fecha límite."); return;
    }
    handleSave([...(config.services || []), {
      id: crypto.randomUUID(), ...newPromo,
      price: Number(newPromo.price), duration: Number(newPromo.duration),
    }]);
  };

  const handleDelete = (id: string) => {
    if (!confirm("¿Eliminar esta promoción?")) return;
    handleSave((config.services || []).filter((s: any) => s.id !== id));
  };

  const stepDuration = (dir: 1 | -1) => {
    const cur  = Number(newPromo.duration);
    const step = cur < 60 ? 15 : 30;
    setNewPromo(p => ({ ...p, duration: String(Math.max(15, cur + dir * step)) }));
  };

  const fmtDur = (min: number) => {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <header>
        <h2 className="text-xl font-bold flex items-center gap-2"><Tag className="text-pink-600" /> Gestión de Promociones</h2>
        <p className="text-zinc-500 text-sm">Creá ofertas por tiempo limitado que resaltarán en tu página.</p>
      </header>

      {/* Formulario */}
      <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-sm">
        <h3 className="font-bold text-lg mb-4 text-pink-700">Crear Nueva Promoción</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input placeholder="Nombre de la Promoción (ej: 2x1 Corte)"
            className="p-2 border rounded-lg w-full outline-none focus:ring-1"
            value={newPromo.name} onChange={e => setNewPromo(p => ({ ...p, name: e.target.value }))} />
          <input type="number" placeholder="Precio Promocional ($)"
            className="p-2 border rounded-lg w-full outline-none"
            value={newPromo.price} onChange={e => setNewPromo(p => ({ ...p, price: e.target.value }))} />
          <div className="md:col-span-2">
            <textarea placeholder="Descripción breve..."
              className="p-2 border rounded-lg w-full h-20 resize-none outline-none"
              value={newPromo.description} onChange={e => setNewPromo(p => ({ ...p, description: e.target.value }))} />
          </div>
          {/* Duración stepper */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-2">Duración del Servicio</label>
            <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-zinc-200 w-fit">
              <button onClick={() => stepDuration(-1)}
                className="w-10 h-10 flex items-center justify-center bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-100 active:scale-95">
                <Minus size={18} />
              </button>
              <div className="text-center min-w-[80px]">
                <span className="text-lg font-bold text-zinc-900 block">{fmtDur(Number(newPromo.duration))}</span>
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Tiempo</span>
              </div>
              <button onClick={() => stepDuration(1)}
                className="w-10 h-10 flex items-center justify-center bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-100 active:scale-95">
                <Plus size={18} />
              </button>
            </div>
          </div>
          {/* Fecha límite */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 mb-2">Válido hasta</label>
            <input type="date" className="p-2 border rounded-lg w-full outline-none"
              value={newPromo.promoEndDate} onChange={e => setNewPromo(p => ({ ...p, promoEndDate: e.target.value }))} />
          </div>
        </div>
        <button onClick={handleAdd} disabled={saving}
          className="px-6 py-2.5 text-white font-bold rounded-xl text-sm flex items-center gap-2 disabled:opacity-60"
          style={{ backgroundColor: "#db2777" }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Crear Promoción</>}
        </button>
      </div>

      {/* Lista */}
      {promos.length > 0 ? (
        <div className="space-y-3">
          {promos.map((p: any) => (
            <div key={p.id} className="bg-white p-5 rounded-2xl border border-pink-100 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-zinc-900">{p.name}</p>
                <p className="text-sm text-zinc-500">
                  ${p.price} — {fmtDur(p.duration)} — hasta {new Date(p.promoEndDate).toLocaleDateString("es-AR")}
                </p>
              </div>
              <button onClick={() => handleDelete(p.id)}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-10 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
          <p className="text-zinc-400 text-sm">No hay promociones activas.</p>
        </div>
      )}
    </div>
  );
}