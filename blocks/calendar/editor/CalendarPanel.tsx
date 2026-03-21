"use client";
// blocks/calendar/editor/CalendarPanel.tsx
// Paneles: Servicios · Equipo · Reservas · Horarios
// Edita las secciones de config_web que CalendarSection y ContactSection consumen.

import { useState } from "react";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Minus, User, Mail,
  MessageCircle, CreditCard, Instagram, Phone, Users,
  Sparkles, Loader2, GripVertical, Tag,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import ScheduleEditor  from "@/components/editors/ScheduleEditor";
import type { BlockEditorProps } from "@/types/blocks";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const PRIMARY = "#577a2c";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">{children}</label>;
}
function Input({ value, onChange, placeholder, type = "text" }: any) {
  return (
    <input type={type} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none" />
  );
}
function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      {label && <span className="text-sm font-medium text-zinc-600 flex-1">{label}</span>}
      <button onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${value ? "bg-[#577a2c]" : "bg-zinc-300"}`}>
        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
function SectionCard({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  const dots: Record<string, string> = { emerald: "bg-emerald-500", blue: "bg-blue-500", amber: "bg-amber-500", violet: "bg-violet-500" };
  return (
    <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
        <span className={`w-2 h-2 rounded-full ${dots[color] || "bg-zinc-400"}`} />
        <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function fmtDur(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return `${h}h${m > 0 ? ` ${m}m` : ""}`;
}

// ─── Panel principal ──────────────────────────────────────────────────────────
export default function CalendarPanel({
  config, updateConfig, updateConfigRoot, updateArray,
  pushToArray, removeFromArray,
}: BlockEditorProps) {
  const servicios = config.servicios || { mostrar: true, titulo: "Nuestros Servicios", items: [] };
  const equipo    = config.equipo    || { mostrar: false, titulo: "Nuestro Equipo", items: [], scheduleType: "unified" };
  const booking   = config.booking   || { requestDeposit: false, requireManualConfirmation: true, depositPercentage: 50 };
  const schedule  = config.schedule  || {};

  const [openWorker, setOpenWorker] = useState<number | null>(null);

  // ── Servicios ─────────────────────────────────────────────────────────────
  const addServicio = () => pushToArray("servicios", {
    titulo: "Nuevo Servicio", desc: "", precio: 0, duracion: 60, imagenUrl: "",
  });

  // ── Equipo ────────────────────────────────────────────────────────────────
  const addMiembro = () => pushToArray("equipo", {
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
  schedule: schedule,
});

  const stepDur = (i: number, dir: 1 | -1) => {
    const cur  = Number(servicios.items?.[i]?.duracion ?? 60);
    const step = cur < 60 ? 15 : 30;
    updateArray("servicios", i, "duracion", Math.max(15, cur + dir * step));
  };
  const grupos: any[] = servicios.grupos || [];

  const addGrupo = () => {
    const newGrupo = { id: crypto.randomUUID(), nombre: "Nuevo grupo", color: "#577a2c" };
    updateConfig("servicios", "grupos", [...grupos, newGrupo]);
  };

  const updateGrupo = (id: string, field: string, value: string) => {
    updateConfig("servicios", "grupos", grupos.map((g: any) => g.id === id ? { ...g, [field]: value } : g));
  };

  const removeGrupo = (id: string) => {
    updateConfig("servicios", "grupos", grupos.filter((g: any) => g.id !== id));
    // Quitar ese grupoId de todos los servicios
    (servicios.items || []).forEach((item: any, i: number) => {
      if (item.grupoIds?.includes(id)) {
        updateArray("servicios", i, "grupoIds", item.grupoIds.filter((gid: string) => gid !== id));
      }
    });
  };

  const toggleServicioGrupo = (servicioIdx: number, grupoId: string) => {
    const current: string[] = (servicios.items || [])[servicioIdx]?.grupoIds || [];
    const next = current.includes(grupoId)
      ? current.filter((id: string) => id !== grupoId)
      : [...current, grupoId];
    updateArray("servicios", servicioIdx, "grupoIds", next);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const items = servicios.items || [];
    const oldIndex = items.findIndex((_: any, i: number) => i === Number(active.id));
    const newIndex  = items.findIndex((_: any, i: number) => i === Number(over.id));
    if (oldIndex !== -1 && newIndex !== -1) {
      updateConfig("servicios", "items", arrayMove(items, oldIndex, newIndex));
    }
  };

  return (
    <div className="space-y-8">

      {/* ── Servicios ──────────────────────────────────────────────────── */}
      <SectionCard title="Servicios" color="emerald">
        <div className="flex items-center justify-between">
          <Toggle label="Mostrar sección" value={!!servicios.mostrar}
            onChange={v => updateConfig("servicios", "mostrar", v)} />
        </div>

        {servicios.mostrar !== false && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <Label>Título de la sección</Label>
              <Input value={servicios.titulo}
                onChange={(v: string) => updateConfig("servicios", "titulo", v)}
                placeholder="Nuestros Servicios" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Grupos de servicios</Label>
                <button onClick={addGrupo}
                  className="text-[11px] font-bold flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed border-zinc-300 text-zinc-400 hover:border-[#577a2c] hover:text-[#577a2c] transition-all">
                  <Plus size={11} /> Agregar grupo
                </button>
              </div>
              {grupos.length === 0 && (
                <p className="text-[11px] text-zinc-400 italic">Sin grupos — todos los servicios se muestran juntos.</p>
              )}
              {grupos.map((grupo: any) => (
                <div key={grupo.id} className="flex items-center gap-2 p-2 bg-zinc-50 rounded-lg border border-zinc-200">
                  <input
                    type="color"
                    value={grupo.color || "#577a2c"}
                    onChange={e => updateGrupo(grupo.id, "color", e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-0 p-0 bg-transparent"
                    title="Color del grupo"
                  />
                  <input
                    value={grupo.nombre}
                    onChange={e => updateGrupo(grupo.id, "nombre", e.target.value)}
                    className="flex-1 text-sm font-bold bg-transparent outline-none border-b border-transparent focus:border-zinc-300"
                  />
                  <button onClick={() => removeGrupo(grupo.id)}
                    className="p-1 text-zinc-300 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* ── Lista de servicios (drag & drop) ── */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={(servicios.items || []).map((_: any, i: number) => i)}
                strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
              {(servicios.items || []).map((item: any, i: number) => (
                <SortableServicioItem key={item.id || i} id={i}>
                <div className="p-3 border border-zinc-200 rounded-xl bg-zinc-50 relative space-y-3">
                  <button onClick={() => removeFromArray("servicios", i)}
                    className="absolute top-2 right-2 p-1 text-zinc-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                  <div className="pr-6">
                    <Label>Nombre del servicio</Label>
                    <Input value={item.titulo}
                      onChange={(v: string) => updateArray("servicios", i, "titulo", v)}
                      placeholder="Corte de pelo" />
                  </div>
                  <div>
                    <Label>Descripción breve</Label>
                    <Input value={item.desc}
                      onChange={(v: string) => updateArray("servicios", i, "desc", v)}
                      placeholder="Descripción opcional" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Precio ($)</Label>
                      <Input type="number" value={item.precio}
                        onChange={(v: string) => updateArray("servicios", i, "precio", Number(v))}
                        placeholder="0" />
                    </div>
                    <div>
                      <Label>Duración</Label>
                      <div className="flex items-center gap-2 bg-white border border-zinc-200 rounded-lg p-1">
                        <button onClick={() => stepDur(i, -1)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="flex-1 text-center text-sm font-bold text-zinc-700">
                          {fmtDur(Number(item.duracion ?? 60))}
                        </span>
                        <button onClick={() => stepDur(i, 1)}
                          className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <ImageUpload label="Imagen del servicio (opcional)"
                    value={item.imagenUrl}
                    onChange={url => updateArray("servicios", i, "imagenUrl", url)} />

                  {/* Profesionales que realizan este servicio */}
                  {equipo.mostrar && (equipo.items || []).length > 0 && (
                    <div>
                      <Label>Profesionales que lo realizan (vacío = todos)</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {(equipo.items || []).map((worker: any) => {
                          const wid = worker.id || worker.nombre;
                          const workerIds: string[] = item.workerIds || [];
                          const isSelected = workerIds.includes(wid);
                          return (
                            <button
                              key={wid}
                              type="button"
                              onClick={() => {
                                const next = isSelected
                                  ? workerIds.filter((id: string) => id !== wid)
                                  : [...workerIds, wid];
                                updateArray("servicios", i, "workerIds", next);
                              }}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                                isSelected
                                  ? "text-white border-transparent"
                                  : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                              }`}
                              style={isSelected ? { backgroundColor: PRIMARY } : {}}
                            >
                              {worker.nombre}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                {grupos.length > 0 && (
                    <div>
                      <Label>Grupos <span className="font-normal text-zinc-400">(puede estar en varios)</span></Label>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {grupos.map((grupo: any) => {
                          const inGroup = (item.grupoIds || []).includes(grupo.id);
                          return (
                            <button key={grupo.id} type="button"
                              onClick={() => toggleServicioGrupo(i, grupo.id)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                                inGroup ? "text-white border-transparent" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400"
                              }`}
                              style={inGroup ? { backgroundColor: grupo.color } : {}}>
                              <Tag size={9} className="inline mr-1" />{grupo.nombre}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                </SortableServicioItem>
              ))}
              </div>
              </SortableContext>
            </DndContext>

            <button onClick={addServicio}
              className="w-full py-2.5 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 text-sm font-bold hover:border-[#577a2c] hover:text-[#577a2c] hover:bg-[#577a2c]/5 transition-all flex items-center justify-center gap-2">
              <Plus size={16} /> Agregar servicio
            </button>
          </div>
        )}
      </SectionCard>

      {/* ── Equipo ─────────────────────────────────────────────────────── */}
      <SectionCard title="Equipo / Profesionales" color="blue">
        <div className="flex items-center justify-between">
          <Toggle label="Mostrar equipo en la web" value={!!equipo.mostrar}
            onChange={v => updateConfig("equipo", "mostrar", v)} />
        </div>

        {equipo.mostrar && (
          <div className="space-y-3 animate-in fade-in">
            <div>
              <Label>Modo de horarios</Label>
              <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200">
                {[["unified","Horario General"],["per_worker","Por Profesional"]].map(([val, lbl]) => (
                  <button key={val} onClick={() => updateConfig("equipo", "scheduleType", val)}
                    className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${(equipo.scheduleType || "unified") === val ? "bg-white shadow text-[#577a2c]" : "text-zinc-500"}`}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {(equipo.items || []).map((m: any, i: number) => (
              <div key={m.id || i} className="border border-zinc-200 rounded-xl bg-zinc-50 overflow-hidden">
                {/* Cabecera */}
                <div className="flex items-center justify-between p-3">
                  <button onClick={() => setOpenWorker(openWorker === i ? null : i)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center shrink-0">
                      {m.photoUrl
                        ? <img src={m.photoUrl} className="w-full h-full object-cover rounded-full" alt="" />
                        : <User size={14} className="text-zinc-500" />}
                    </div>
                    <span className="font-bold text-sm text-zinc-800 truncate">{m.nombre || "Profesional"}</span>
                    {openWorker === i ? <ChevronUp size={14} className="ml-auto shrink-0 text-zinc-400" /> : <ChevronDown size={14} className="ml-auto shrink-0 text-zinc-400" />}
                  </button>
                  <button onClick={() => removeFromArray("equipo", i)}
                    className="p-1.5 text-zinc-300 hover:text-red-500 transition-colors ml-2 shrink-0">
                    <Trash2 size={14} />
                  </button>
                </div>

                {openWorker === i && (
                  <div className="px-3 pb-3 space-y-3 border-t border-zinc-100 pt-3 animate-in fade-in">
                    <div>
                      <Label>Nombre</Label>
                      <Input value={m.nombre}
                        onChange={(v: string) => updateArray("equipo", i, "nombre", v)} />
                    </div>
                    
                    <div>
                      <Label>Rol / Especialidad</Label>
                      <Input value={m.role}
                        onChange={(v: string) => updateArray("equipo", i, "role", v)}
                        placeholder="Ej: Estilista" />
                    </div>
                    {/* Campos de Contacto, Pagos y Simultaneidad */}
                    <div className="space-y-3">
                      <div>
                        <Label>Email para notificaciones</Label>
                        <Input value={m.email} onChange={(v: string) => updateArray("equipo", i, "email", v)} placeholder="profesional@correo.com" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Teléfono / WhatsApp</Label>
                          <Input value={m.telefono} onChange={(v: string) => updateArray("equipo", i, "telefono", v)} placeholder="Ej: 54911..." />
                        </div>
                        <div>
                          <Label>Instagram (@usuario)</Label>
                          <Input value={m.instagram} onChange={(v: string) => updateArray("equipo", i, "instagram", v)} placeholder="@usuario" />
                        </div>
                      </div>

                      <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 space-y-2">
                        <Label><span className="text-indigo-700 flex items-center gap-1"><CreditCard size={12}/> Link de pago (MP)</span></Label>
                        <Input value={m.paymentLink} onChange={(v: string) => updateArray("equipo", i, "paymentLink", v)} placeholder="https://mpago.la/..." />
                      </div>

                      <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 space-y-2">
                        <Label><span className="text-emerald-700">Alias / CBU para Señas</span></Label>
                        <Input value={m.aliasCvu} onChange={(v: string) => updateArray("equipo", i, "aliasCvu", v)} placeholder="mi.alias.mp" />
                      </div>

                      <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 space-y-3">
                        <Toggle 
                          label="¿Atiende a más de uno a la vez?" 
                          value={!!m.allowSimultaneous}
                          onChange={(v) => {
                            updateArray("equipo", i, "allowSimultaneous", v);
                            if (v && (!m.simultaneousCapacity || m.simultaneousCapacity < 2)) {
                              updateArray("equipo", i, "simultaneousCapacity", 2);
                            }
                          }}
                        />
                        {m.allowSimultaneous && (
                          <div className="animate-in fade-in">
                            <Label>Capacidad máxima (personas)</Label>
                            <Input type="number" min="2" value={m.simultaneousCapacity} onChange={(v: any) => updateArray("equipo", i, "simultaneousCapacity", parseInt(v))} />
                          </div>
                        )}
                      </div>
                    </div>
                    <ImageUpload label="Foto" value={m.photoUrl}
                      onChange={url => updateArray("equipo", i, "photoUrl", url)} />
                    {equipo.scheduleType === "per_worker" && (
                      <div>
                        <Label>Horario de {m.nombre || "este profesional"}</Label>
                        <ScheduleEditor
                          schedule={m.schedule || schedule}
                          onChange={s => updateArray("equipo", i, "schedule", s)}
                        />
                      </div>
                    )}
                  </div>
                  
                )}
              </div>
            ))}

            <button onClick={addMiembro}
              className="w-full py-2.5 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 text-sm font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
              <Plus size={16} /> Agregar profesional
            </button>
          </div>
        )}
      </SectionCard>

      {/* ── Configuración de Reservas ───────────────────────────────────── */}
      <SectionCard title="Configuración de Reservas" color="amber">
        <div className="space-y-4">
          <Toggle label="Confirmación manual de turnos" value={!!booking.requireManualConfirmation}
            onChange={v => updateConfig("booking", "requireManualConfirmation", v)} />
          <p className="text-xs text-zinc-400 -mt-2">
            Si está activado, los turnos quedan pendientes hasta que los aprobés.
          </p>

          <div className="h-px bg-zinc-100" />

          <Toggle label="Cobrar seña al reservar" value={!!booking.requestDeposit}
            onChange={v => updateConfig("booking", "requestDeposit", v)} />

          {booking.requestDeposit && (
            <div className="pl-2 animate-in fade-in">
              <Label>Porcentaje de seña ({booking.depositPercentage ?? 50}%)</Label>
              <input type="range" min="10" max="100" step="5"
                value={booking.depositPercentage ?? 50}
                onChange={e => updateConfig("booking", "depositPercentage", Number(e.target.value))}
                className="w-full accent-[#577a2c]" />
            </div>
          )}
        </div>
      </SectionCard>

      {/* ── Horarios generales ──────────────────────────────────────────── */}
      {(!equipo.mostrar || equipo.scheduleType !== "per_worker") && (
        <SectionCard title="Horarios de Atención" color="violet">
          <ScheduleEditor
            schedule={schedule}
            onChange={s => updateConfigRoot("schedule", s)}
          />
        </SectionCard>
      )}

      {/* ── Notificaciones ─────────────────────────────────────────────── */}
      <NotificationsPanel config={config} updateConfig={updateConfig} />
    </div>
  );
}

// ─── Notificaciones ───────────────────────────────────────────────────────────
const NOTIF_TYPES = [
  { id: "confirmation", label: "Confirmación" },
  { id: "deposit",      label: "Seña"         },
  { id: "reminder",     label: "Recordatorio" },
] as const;

const DEFAULT_NOTIF = {
  enabled: true, sendViaEmail: true, sendViaWhatsapp: true,
  subject: "", body: "", whatsappBody: "", bannerUrl: "",
};
function SortableServicioItem({ id, children }: { id: number; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="relative">
      <button {...attributes} {...listeners}
        className="absolute top-3 left-2 p-1 text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing z-10">
        <GripVertical size={14} />
      </button>
      <div className="pl-6">{children}</div>
    </div>
  );
}
function NotificationsPanel({ config, updateConfig }: Pick<BlockEditorProps, "config" | "updateConfig">) {
  const [activeType, setActiveType] = useState<"confirmation" | "deposit" | "reminder">("confirmation");
  const notifications = (config.notifications as any) || {};
  const tmpl = { ...DEFAULT_NOTIF, ...(notifications[activeType] || {}) };

  const update = (patch: Partial<typeof DEFAULT_NOTIF>) =>
    updateConfig("notifications", activeType, { ...tmpl, ...patch });

  return (
    <SectionCard title="Notificaciones" color="emerald">
      <p className="text-xs text-zinc-400 -mt-2 mb-3">
        Configurá los mensajes automáticos que recibe el cliente al reservar.
      </p>

      {/* Tabs tipo */}
      <div className="flex bg-zinc-100 p-1 rounded-xl border border-zinc-200 mb-4">
        {NOTIF_TYPES.map(t => (
          <button key={t.id} onClick={() => setActiveType(t.id)}
            className={`flex-1 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeType === t.id ? "bg-white shadow text-[#577a2c]" : "text-zinc-500"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 animate-in fade-in">
        {/* Activar / canales */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-zinc-700">Activar esta notificación</span>
          <button onClick={() => update({ enabled: !tmpl.enabled })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${tmpl.enabled ? "bg-[#577a2c]" : "bg-zinc-300"}`}>
            <span className={`inline-block h-3 w-3 rounded-full bg-white transition-transform ${tmpl.enabled ? "translate-x-5" : "translate-x-1"}`} />
          </button>
        </div>

        {tmpl.enabled && (
          <>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer">
                <input type="checkbox" checked={tmpl.sendViaEmail !== false}
                  onChange={e => update({ sendViaEmail: e.target.checked })}
                  className="accent-[#577a2c] w-3.5 h-3.5" />
                <Mail size={12} /> Por Email
              </label>
              <label className="flex items-center gap-2 text-xs text-zinc-600 cursor-pointer">
                <input type="checkbox" checked={!!tmpl.sendViaWhatsapp}
                  onChange={e => update({ sendViaWhatsapp: e.target.checked })}
                  className="accent-green-600 w-3.5 h-3.5" />
                <MessageCircle size={12} className="text-green-600" /> Por WhatsApp
              </label>
            </div>

            <div>
              <Label>Asunto (Email / Título WhatsApp)</Label>
              <input value={tmpl.subject}
                onChange={e => update({ subject: e.target.value })}
                className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none text-zinc-900"
                placeholder="Tu turno fue confirmado" />
            </div>

            {tmpl.sendViaEmail !== false && (
              <div>
                <Label>Mensaje Email (HTML)</Label>
                <textarea rows={4} value={tmpl.body}
                  onChange={e => update({ body: e.target.value })}
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none resize-none text-zinc-900"
                  placeholder="<p>Hola {{cliente}}, tu turno...</p>" />
              </div>
            )}

            {tmpl.sendViaWhatsapp && (
              <div>
                <Label>Mensaje WhatsApp (texto plano)</Label>
                <textarea rows={3} value={tmpl.whatsappBody}
                  onChange={e => update({ whatsappBody: e.target.value })}
                  className="w-full p-2 border border-green-200 rounded-lg text-sm bg-green-50/30 focus:ring-2 focus:ring-green-300/30 outline-none resize-none text-zinc-900"
                  placeholder="Hola {{cliente}}, tu turno para {{servicio}}..." />
                <p className="text-[10px] text-green-600 mt-1">Variables: {"{{cliente}}"}, {"{{servicio}}"}, {"{{fecha}}"}, {"{{hora}}"}</p>
              </div>
            )}

            {tmpl.sendViaEmail !== false && (
              <ImageUpload label="Banner / Cabecera (solo email)"
                value={tmpl.bannerUrl}
                onChange={url => update({ bannerUrl: url })} />
            )}
          </>
        )}
      </div>
    </SectionCard>
  );
}