"use client";
// blocks/equipo/editor/EquipoPanel.tsx
//
// Editor del bloque Equipo — gestiona la lista de profesionales,
// el modo de horarios (unified / per_worker) y los datos de cada miembro.
//
// La lógica de horarios se coordina con CalendarPanel:
//   - scheduleType "unified"     → CalendarPanel muestra "Horarios de Atención"
//   - scheduleType "per_worker"  → CalendarPanel oculta el horario general
//                                   y cada worker tiene su propio ScheduleEditor acá
//
// Ambos paneles leen el mismo config_web, así que el condicional en
// CalendarPanel reacciona automáticamente cuando este panel cambia scheduleType.

import { useState } from "react";
import {
  Plus, Trash2, ChevronDown, ChevronUp,
  User, CreditCard, Instagram, Users, Minus,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import ScheduleEditor from "@/components/editors/ScheduleEditor";
import type { BlockEditorProps } from "@/types/blocks";

// ─── Helpers UI ───────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">
      {children}
    </label>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: any; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
    />
  );
}

function Toggle({
  value, onChange, label,
}: {
  value: boolean; onChange: (v: boolean) => void; label?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      {label && (
        <span className="text-sm font-medium text-zinc-600 flex-1">{label}</span>
      )}
      <button
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
          value ? "bg-[#577a2c]" : "bg-zinc-300"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
            value ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────
export default function EquipoPanel({
  config,
  updateConfig,
  updateArray,
  pushToArray,
  removeFromArray,
}: BlockEditorProps) {
  // Equipo: lee del mismo config_web que CalendarPanel
  const equipo = config.equipo || {
    mostrar: true,
    titulo: "Nuestro Equipo",
    items: [],
    scheduleType: "unified",
  };

  // Horario general del negocio — se usa para inicializar el horario de
  // nuevos workers cuando scheduleType === "per_worker"
  const schedule = config.schedule || {};

  const [openWorker, setOpenWorker] = useState<number | null>(null);

  // ── Agregar miembro ───────────────────────────────────────────────────────
  const addMiembro = () =>
    pushToArray("equipo", {
      id: crypto.randomUUID(),
      nombre: "Nuevo Profesional",
      role: "Profesional",
      photoUrl: "",
      email: "",
      paymentLink: "",
      aliasCvu: "",
      telefono: "",
      instagram: "",
      allowSimultaneous: false,
      simultaneousCapacity: 2,
      // Inicializamos con el horario general como punto de partida
      schedule: schedule,
    });

  const items: any[] = (equipo as any).items || [];
  const scheduleType: string = (equipo as any).scheduleType || "unified";

  return (
    <div className="space-y-6">

      {/* ── Configuración general del equipo ──────────────────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">
            Equipo / Profesionales
          </h3>
        </div>

        {/* Título de la sección */}
        <div>
          <Label>Título de la sección</Label>
          <Input
            value={(equipo as any).titulo}
            onChange={v => updateConfig("equipo", "titulo", v)}
            placeholder="Nuestro Equipo"
          />
        </div>

        {/* Modo de horarios */}
        <div>
          <Label>Modo de horarios</Label>
          <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            {([
              ["unified", "Horario General"],
              ["per_worker", "Por Profesional"],
            ] as const).map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => updateConfig("equipo", "scheduleType", val)}
                className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                  scheduleType === val
                    ? "bg-white shadow text-[#577a2c]"
                    : "text-zinc-500"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1.5">
            {scheduleType === "unified"
              ? "Todos los profesionales comparten el horario general del bloque Turnos."
              : "Cada profesional tiene su propio horario configurable abajo."}
          </p>
        </div>
      </section>

      {/* ── Lista de profesionales ─────────────────────────────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
          <Users size={13} className="text-blue-500" />
          <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">
            Profesionales ({items.length})
          </h3>
        </div>

        {items.length === 0 && (
          <p className="text-sm text-zinc-400 italic text-center py-4">
            Todavía no hay profesionales. Agregá el primero abajo.
          </p>
        )}

        {items.map((m: any, i: number) => (
          <div
            key={m.id || i}
            className="border border-zinc-200 rounded-xl bg-zinc-50 overflow-hidden"
          >
            {/* ── Cabecera del worker ── */}
            <div className="flex items-center justify-between p-3">
              <button
                onClick={() => setOpenWorker(openWorker === i ? null : i)}
                className="flex items-center gap-2 text-left flex-1 min-w-0"
              >
                <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                  {m.photoUrl ? (
                    <img
                      src={m.photoUrl}
                      className="w-full h-full object-cover rounded-full"
                      alt=""
                    />
                  ) : (
                    <User size={14} className="text-zinc-500" />
                  )}
                </div>
                <span className="font-bold text-sm text-zinc-800 truncate">
                  {m.nombre || "Profesional"}
                </span>
                {openWorker === i ? (
                  <ChevronUp size={14} className="ml-auto shrink-0 text-zinc-400" />
                ) : (
                  <ChevronDown size={14} className="ml-auto shrink-0 text-zinc-400" />
                )}
              </button>
              <button
                onClick={() => {
                  removeFromArray("equipo", i);
                  if (openWorker === i) setOpenWorker(null);
                }}
                className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors ml-2 shrink-0"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* ── Detalle del worker (expandible) ── */}
            {openWorker === i && (
              <div className="px-3 pb-3 space-y-3 border-t border-zinc-100 pt-3 animate-in fade-in">

                {/* Datos básicos */}
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={m.nombre}
                    onChange={v => updateArray("equipo", i, "nombre", v)}
                    placeholder="Nombre del profesional"
                  />
                </div>

                <div>
                  <Label>Rol / Especialidad</Label>
                  <Input
                    value={m.role}
                    onChange={v => updateArray("equipo", i, "role", v)}
                    placeholder="Ej: Estilista"
                  />
                </div>

                {/* Foto */}
                <ImageUpload
                  label="Foto"
                  value={m.photoUrl}
                  onChange={url => updateArray("equipo", i, "photoUrl", url)}
                />

                {/* Contacto */}
                <div>
                  <Label>Email para notificaciones</Label>
                  <Input
                    value={m.email}
                    onChange={v => updateArray("equipo", i, "email", v)}
                    placeholder="profesional@correo.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Teléfono / WhatsApp</Label>
                    <Input
                      value={m.telefono}
                      onChange={v => updateArray("equipo", i, "telefono", v)}
                      placeholder="Ej: 54911..."
                    />
                  </div>
                  <div>
                    <Label>Instagram (@usuario)</Label>
                    <Input
                      value={m.instagram}
                      onChange={v => updateArray("equipo", i, "instagram", v)}
                      placeholder="@usuario"
                    />
                  </div>
                </div>

                {/* Pagos */}
                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 space-y-2">
                  <Label>
                    <span className="text-indigo-700 flex items-center gap-1">
                      <CreditCard size={12} /> Link de pago (MP)
                    </span>
                  </Label>
                  <Input
                    value={m.paymentLink}
                    onChange={v => updateArray("equipo", i, "paymentLink", v)}
                    placeholder="https://mpago.la/..."
                  />
                </div>

                <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 space-y-2">
                  <Label>
                    <span className="text-emerald-700">Alias / CBU para Señas</span>
                  </Label>
                  <Input
                    value={m.aliasCvu}
                    onChange={v => updateArray("equipo", i, "aliasCvu", v)}
                    placeholder="mi.alias.mp"
                  />
                </div>

                {/* Simultaneidad */}
                <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 space-y-3">
                  <Toggle
                    label="¿Atiende a más de uno a la vez?"
                    value={!!m.allowSimultaneous}
                    onChange={v => {
                      updateArray("equipo", i, "allowSimultaneous", v);
                      if (v && (!m.simultaneousCapacity || m.simultaneousCapacity < 2)) {
                        updateArray("equipo", i, "simultaneousCapacity", 2);
                      }
                    }}
                  />
                  {m.allowSimultaneous && (
                    <div className="animate-in fade-in">
                      <Label>Capacidad máxima (personas)</Label>
                      <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg p-1">
                        <button
                          onClick={() =>
                            updateArray(
                              "equipo", i, "simultaneousCapacity",
                              Math.max(2, (m.simultaneousCapacity || 2) - 1)
                            )
                          }
                          className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="flex-1 text-center text-sm font-bold text-zinc-700">
                          {m.simultaneousCapacity || 2} personas
                        </span>
                        <button
                          onClick={() =>
                            updateArray(
                              "equipo", i, "simultaneousCapacity",
                              (m.simultaneousCapacity || 2) + 1
                            )
                          }
                          className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Horario individual (solo cuando scheduleType === "per_worker") ── */}
                {scheduleType === "per_worker" && (
                  <div className="pt-1">
                    <Label>
                      Horario de {m.nombre || "este profesional"}
                    </Label>
                    <p className="text-[11px] text-zinc-400 mb-2">
                      Este horario reemplaza al general solo para este profesional.
                    </p>
                    <ScheduleEditor
                      schedule={m.schedule || schedule}
                      onChange={s => updateArray("equipo", i, "schedule", s)}
                    />
                  </div>
                )}

                {scheduleType === "unified" && (
                  <p className="text-[11px] text-zinc-400 bg-zinc-100 rounded-lg px-3 py-2">
                    Este profesional usa el horario general. Podés cambiarlo en el panel{" "}
                    <strong>Turnos &amp; Calendario → Horarios de Atención</strong>.
                  </p>
                )}

              </div>
            )}
          </div>
        ))}

        <button
          onClick={addMiembro}
          className="w-full py-2.5 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 text-sm font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Agregar profesional
        </button>
      </section>
    </div>
  );
}