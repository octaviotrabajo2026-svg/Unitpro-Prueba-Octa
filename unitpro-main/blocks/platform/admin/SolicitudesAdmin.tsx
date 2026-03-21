"use client";
// blocks/platform/admin/SolicitudesAdmin.tsx
//
// Lógica IDÉNTICA al tab "solicitudes" del ConfirmBookingDashboard legacy:
//   Zona 1 — esperando_senia   → Registrar Pago
//   Zona 2 — pendiente         → Rechazar / Aceptar (abre modal precio en shell)
//   Filtro por trabajador si hay equipo configurado.

import { useState } from "react";
import {
  Clock, CreditCard, MessageCircle, X, Check, ExternalLink,
} from "lucide-react";
import {
  cancelAppointment,
  markDepositPaid,
} from "@/app/actions/confirm-booking/manage-appointment";
import type { BlockAdminProps } from "@/types/blocks";

const PRIMARY = "#577a2c";

export default function SolicitudesAdmin({ negocio, sharedData }: BlockAdminProps) {
  const { turnos, fetchData, openConfirmModal } = sharedData;

  const [filtro, setFiltro] = useState("Todos");

  const equipo = negocio.config_web?.equipo?.members || negocio.config_web?.equipo?.items || [];
  const trabajadores: string[] = equipo.map((m: any) => m.name || m.nombre).filter(Boolean);

  const pasaFiltro = (t: any) => {
    if (filtro === "Todos") return true;
    const fromService =
      typeof t.servicio === "string" && t.servicio.includes(" - ")
        ? t.servicio.split(" - ")[1].trim()
        : "";
    return (t.worker_name?.trim() || fromService) === filtro;
  };

  const senia   = turnos.filter(t => t.estado === "esperando_senia" && pasaFiltro(t));
  const pending = turnos.filter(t => t.estado === "pendiente"       && pasaFiltro(t));

  const handleMarkPaid = async (id: string) => {
    if (!confirm("¿Confirmar que llegó el pago? Esto intentará reservar el lugar en Google Calendar.")) return;
    const res = await markDepositPaid(id);
    if (!res.success) alert(res.error);
    else await fetchData();
  };

  const handleCancel = async (id: string, label = "¿Cancelar turno?") => {
    if (!confirm(label)) return;
    const res = await cancelAppointment(id);
    if (res.success) await fetchData();
    else alert("Error: " + res.error);
  };

  const handleAccept = (t: any) => {
    const dur = Math.round(
      (new Date(t.fecha_fin).getTime() - new Date(t.fecha_inicio).getTime()) / 60000
    );
    openConfirmModal(t.id, t.precio_total || 0, dur);
  };

  const todoOkEl = (
    <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
      <Check size={40} className="mx-auto text-zinc-200 mb-3" />
      <h3 className="font-bold text-zinc-900">Todo al día</h3>
      <p className="text-zinc-400 text-sm mt-1">No hay solicitudes pendientes.</p>
    </div>
  );

  return (
    <div className="animate-in fade-in space-y-8">
      {/* Header + filtro */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Centro de Solicitudes</h1>
          <p className="text-zinc-500 text-sm">Gestioná pagos pendientes y nuevas reservas.</p>
        </div>
        {trabajadores.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-bold text-zinc-500">Filtrar por:</label>
            <select
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              className="p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 bg-white"
            >
              <option value="Todos">Todos</option>
              {trabajadores.map((n, i) => <option key={i} value={n}>{n}</option>)}
            </select>
          </div>
        )}
      </header>

      {senia.length === 0 && pending.length === 0 && todoOkEl}

      {/* ── Zona 1: Esperando Seña ──────────────────────────────────────── */}
      {senia.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wide flex items-center gap-2 bg-orange-50 w-fit px-3 py-1 rounded-full border border-orange-100">
            <Clock size={14} /> Esperando Pago de Seña
          </h3>

          {senia.map(t => (
            <div key={t.id}
              className="bg-white p-5 rounded-2xl border border-orange-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500" />
              <div className="flex-1 pl-3">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-lg text-zinc-900">{t.cliente_nombre}</span>
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-full uppercase">Nuevo</span>
                  {t.cliente_telefono && (
                    <a href={`https://wa.me/${t.cliente_telefono.replace(/\D/g, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors">
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
                </div>
                <p className="text-zinc-600 text-sm font-medium">{t.servicio}</p>
                <div className="flex gap-4 mt-2 text-xs text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {new Date(t.fecha_inicio).toLocaleDateString("es-AR")}
                  </span>
                  <span>
                    {new Date(t.fecha_inicio).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}hs
                  </span>
                </div>
                <p className="text-[10px] text-orange-600 mt-2 font-bold">
                  ⚠️ No agendado en Google Calendar todavía.
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleMarkPaid(t.id)}
                  className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-orange-200 transition-colors">
                  <CreditCard size={16} /> Registrar Pago
                </button>
                <button
                  onClick={() => handleCancel(t.id)}
                  className="px-3 py-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
          ))}

          <div className="h-px bg-zinc-200 my-2" />
        </div>
      )}

      {/* ── Zona 2: Nuevas Solicitudes (pendiente) ──────────────────────── */}
      {pending.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-2 px-1">
            Nuevas Solicitudes ({pending.length})
          </h3>

          {pending.map(t => (
            <div key={t.id}
              className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="font-bold text-lg text-zinc-900">{t.cliente_nombre}</span>
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-full uppercase">Nuevo</span>
                  {t.cliente_telefono && (
                    <a href={`https://wa.me/${t.cliente_telefono.replace(/\D/g, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors">
                      <MessageCircle size={14} /> WhatsApp
                    </a>
                  )}
                </div>
                <p className="text-zinc-600 text-sm font-medium">{t.servicio}</p>
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-zinc-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> {new Date(t.fecha_inicio).toLocaleDateString("es-AR")}
                  </span>
                  <span>{new Date(t.fecha_inicio).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}hs</span>
                </div>

                {/* Mensaje y fotos adjuntas */}
                {(t.mensaje || t.fotos?.length > 0) && (
                  <div className="mt-2 p-4 bg-zinc-50 rounded-xl border border-zinc-100 space-y-4">
                    {t.mensaje && (
                      <p className="text-sm text-zinc-700 italic">"{t.mensaje}"</p>
                    )}
                    {t.fotos?.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Archivos Adjuntos:</span>
                        <div className="flex gap-2 flex-wrap">
                          {t.fotos.map((url: string, i: number) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                              className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 shadow-sm hover:ring-2 hover:ring-indigo-500 transition-all group">
                              <img src={url} alt={`Adjunto ${i + 1}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <ExternalLink size={12} className="text-white opacity-0 group-hover:opacity-100" />
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 shrink-0">
                <button
                  onClick={() => handleCancel(t.id, "¿Rechazar esta solicitud?")}
                  className="flex-1 md:flex-none px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors text-sm">
                  Rechazar
                </button>
                <button
                  onClick={() => handleAccept(t)}
                  className="flex-1 md:flex-none px-4 py-2 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                  style={{ backgroundColor: PRIMARY }}>
                  <Check size={16} /> Aceptar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}