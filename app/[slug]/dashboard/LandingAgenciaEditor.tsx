"use client";
// app/[slug]/dashboard/LandingAgenciaEditor.tsx
// Editor embebido full-screen para la landing de la agencia.
// Panel izquierdo = formulario por secciones. Panel derecho = preview en vivo.

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import {
  ArrowLeft, Save, Loader2, CheckCircle, Plus, Trash2,
  Globe, MessageCircle, Mail, Instagram, Facebook,
  ChevronDown, ChevronUp, Palette, Type, Phone, Layers,
} from "lucide-react";
import LandingAgencia, { DEFAULT_LANDING_CONFIG } from "@/app/[slug]/LandingAgencia";
import InlineAlert from "@/components/ui/InlineAlert";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface Service { id: string; titulo: string; descripcion: string; icono: string; }
interface LandingConfig {
  hero:     { titulo: string; subtitulo: string; };
  colors:   { primary: string; bg: string; };
  services: Service[];
  contact:  { whatsapp: string; email: string; instagram: string; facebook: string; };
}

const ICONOS_OPTS = ["Globe", "Star", "Zap", "Briefcase", "Phone", "Layers"];
const PRIMARY     = "#577a2c";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function SectionCard({ title, icon, open, onToggle, children }: {
  title: string; icon: React.ReactNode; open: boolean;
  onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs"
            style={{ backgroundColor: PRIMARY }}>{icon}</div>
          <span className="font-bold text-sm text-slate-900">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">{children}</div>}
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder = "", maxLength }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; maxLength?: number;
}) {
  const showCounter = maxLength !== undefined && value.length / maxLength >= 0.8;
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <label className="text-[11px] font-bold text-slate-400 uppercase">{label}</label>
        {showCounter && (
          <span className={`text-[11px] font-mono ${value.length >= maxLength ? 'text-red-500' : 'text-amber-500'}`}>
            {value.length}/{maxLength}
          </span>
        )}
      </div>
      {type === "textarea"
        ? <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            maxLength={maxLength}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900 resize-none" />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            maxLength={maxLength}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900" />
      }
    </div>
  );
}

// ─── Editor principal ─────────────────────────────────────────────────────────
interface Props {
  agency:  any;       // fila completa de agencies
  onClose: () => void;
  onSaved: () => void;
}

export default function LandingAgenciaEditor({ agency, onClose, onSaved }: Props) {
  const supabase = createClient();

  // Inicializar config desde BD o defaults
  const initCfg = (): LandingConfig => {
    const raw = agency.landing_config || {};
    return {
      hero:     { ...DEFAULT_LANDING_CONFIG.hero,    ...(raw.hero    || {}) },
      colors:   { ...DEFAULT_LANDING_CONFIG.colors,  ...(raw.colors  || {}) },
      services: (raw.services?.length > 0) ? raw.services : DEFAULT_LANDING_CONFIG.services,
      contact:  { ...DEFAULT_LANDING_CONFIG.contact, ...(raw.contact || {}) },
    };
  };

  const initialCfg = initCfg();
  const [cfg,    setCfg]    = useState<LandingConfig>(initialCfg);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [saveError, setSaveError] = useState("");
  const [openSection, setOpenSection] = useState<string>("hero");
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [confirmClose, setConfirmClose] = useState(false);

  const hasUnsavedChanges = JSON.stringify(cfg) !== JSON.stringify(initialCfg);

  // Para el preview necesitamos un objeto tipo "agency" con landing_config actualizado
  const previewData = { ...agency, landing_config: cfg };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      setConfirmClose(true);
    } else {
      onClose();
    }
  };

  // ── Helpers de estado ────────────────────────────────────────────────────
  const setHero    = useCallback((k: keyof LandingConfig["hero"],    v: string) =>
    setCfg(p => ({ ...p, hero:    { ...p.hero,    [k]: v } })), []);
  const setColors  = useCallback((k: keyof LandingConfig["colors"],  v: string) =>
    setCfg(p => ({ ...p, colors:  { ...p.colors,  [k]: v } })), []);
  const setContact = useCallback((k: keyof LandingConfig["contact"], v: string) =>
    setCfg(p => ({ ...p, contact: { ...p.contact, [k]: v } })), []);

  const addService = () =>
    setCfg(p => ({
      ...p,
      services: [...p.services, {
        id: crypto.randomUUID(), titulo: "Nuevo servicio", descripcion: "Descripción del servicio.", icono: "Globe",
      }],
    }));

  const updateService = (id: string, field: keyof Service, value: string) =>
    setCfg(p => ({ ...p, services: p.services.map(s => s.id === id ? { ...s, [field]: value } : s) }));

  const removeService = (id: string) =>
    setCfg(p => ({ ...p, services: p.services.filter(s => s.id !== id) }));

  // ── Guardar ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    const { error } = await supabase
      .from("agencies")
      .update({ landing_config: cfg })
      .eq("id", agency.id);
    if (error) { setSaveError("Error al guardar: " + error.message); }
    else { setSaved(true); onSaved(); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  };

  const toggle = (id: string) => setOpenSection(p => p === id ? "" : id);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex bg-slate-100 font-sans overflow-hidden">

      <ConfirmDialog
        open={confirmClose}
        title="¿Salir sin guardar?"
        description="Tenés cambios sin guardar. Si salís ahora, se perderán."
        confirmLabel="Salir sin guardar"
        cancelLabel="Seguir editando"
        variant="warning"
        onConfirm={() => { setConfirmClose(false); onClose(); }}
        onCancel={() => setConfirmClose(false)}
      />

      {/* ── PANEL IZQUIERDO ─────────────────────────────────────────────── */}
      <div className={`w-full sm:w-[380px] lg:w-[400px] h-full flex flex-col bg-[#ede9dd] border-r border-slate-200 shrink-0 ${mobileView === 'preview' ? 'hidden sm:flex' : 'flex'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={handleClose}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="font-bold text-slate-900 text-sm leading-tight">Editor de Landing</h2>
              <p className="text-xs text-slate-400">{agency.nombre_agencia || agency.name}</p>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving || saved}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              saved ? "bg-green-50 text-green-700 border border-green-200"
                    : "text-white hover:opacity-90"
            }`}
            style={!saved ? { backgroundColor: PRIMARY } : {}}>
            {saving ? <><Loader2 size={13} className="animate-spin" />Guardando</>
              : saved ? <><CheckCircle size={13} />Guardado</>
              : <><Save size={13} />Guardar</>}
          </button>
        </div>

        {/* Save error */}
        {saveError && (
          <div className="px-5 pt-3">
            <InlineAlert type="error" message={saveError} onDismiss={() => setSaveError("")} />
          </div>
        )}

        {/* Mobile tab toggle */}
        <div className="sm:hidden flex border-b border-slate-200 bg-white shrink-0">
          <button
            onClick={() => setMobileView('edit')}
            className={`flex-1 py-2.5 text-xs font-bold transition-colors ${mobileView === 'edit' ? 'text-[#577a2c] border-b-2 border-[#577a2c]' : 'text-slate-400'}`}
          >
            Editar
          </button>
          <button
            onClick={() => setMobileView('preview')}
            className={`flex-1 py-2.5 text-xs font-bold transition-colors ${mobileView === 'preview' ? 'text-[#577a2c] border-b-2 border-[#577a2c]' : 'text-slate-400'}`}
          >
            Preview
          </button>
        </div>

        {/* Secciones */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">

          {/* Hero */}
          <SectionCard title="Hero" icon={<Type size={14} />} open={openSection === "hero"} onToggle={() => toggle("hero")}>
            <InputField label="Título principal" value={cfg.hero.titulo}
              onChange={v => setHero("titulo", v)} type="textarea"
              placeholder="Transformamos negocios con soluciones digitales."
              maxLength={80} />
            <InputField label="Subtítulo" value={cfg.hero.subtitulo}
              onChange={v => setHero("subtitulo", v)} type="textarea"
              placeholder="Descripción breve de tu agencia."
              maxLength={200} />
          </SectionCard>

          {/* Colores */}
          <SectionCard title="Colores" icon={<Palette size={14} />} open={openSection === "colors"} onToggle={() => toggle("colors")}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Color principal</label>
                <div className="flex items-center gap-2 p-2 border border-slate-200 rounded-xl bg-white">
                  <input type="color" value={cfg.colors.primary} onChange={e => setColors("primary", e.target.value)}
                    className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent" />
                  <span className="text-xs font-mono text-slate-600">{cfg.colors.primary}</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase mb-1.5 block">Fondo de página</label>
                <div className="flex items-center gap-2 p-2 border border-slate-200 rounded-xl bg-white">
                  <input type="color" value={cfg.colors.bg} onChange={e => setColors("bg", e.target.value)}
                    className="w-8 h-8 rounded-lg border-0 cursor-pointer bg-transparent" />
                  <span className="text-xs font-mono text-slate-600">{cfg.colors.bg}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Servicios */}
          <SectionCard title="Servicios" icon={<Layers size={14} />} open={openSection === "services"} onToggle={() => toggle("services")}>
            {cfg.services.map((s, i) => (
              <div key={s.id} className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Servicio {i + 1}</span>
                  <button onClick={() => removeService(s.id)}
                    className="p-1 text-slate-300 hover:text-red-500 transition-colors rounded">
                    <Trash2 size={13} />
                  </button>
                </div>
                <input value={s.titulo} onChange={e => updateService(s.id, "titulo", e.target.value)}
                  placeholder="Nombre del servicio" maxLength={50}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900 bg-white" />
                <textarea rows={2} value={s.descripcion} onChange={e => updateService(s.id, "descripcion", e.target.value)}
                  placeholder="Descripción" maxLength={150}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900 resize-none bg-white" />
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Ícono</label>
                  <select value={s.icono} onChange={e => updateService(s.id, "icono", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none bg-white text-zinc-900">
                    {ICONOS_OPTS.map(ic => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                </div>
              </div>
            ))}
            <button onClick={addService}
              className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-sm font-bold text-slate-400 hover:border-[#577a2c] hover:text-[#577a2c] transition-colors flex items-center justify-center gap-2">
              <Plus size={14} /> Agregar servicio
            </button>
          </SectionCard>

          {/* Contacto */}
          <SectionCard title="Contacto" icon={<Phone size={14} />} open={openSection === "contact"} onToggle={() => toggle("contact")}>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">WhatsApp</label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input type="text" value={cfg.contact.whatsapp} onChange={e => setContact("whatsapp", e.target.value)}
                  placeholder="+5493413000000"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input type="email" value={cfg.contact.email} onChange={e => setContact("email", e.target.value)}
                  placeholder="hola@miagencia.com"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Instagram</label>
              <div className="relative">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input type="text" value={cfg.contact.instagram} onChange={e => setContact("instagram", e.target.value)}
                  placeholder="@miagencia"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-400 uppercase mb-1 block">Facebook</label>
              <div className="relative">
                <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input type="text" value={cfg.contact.facebook} onChange={e => setContact("facebook", e.target.value)}
                  placeholder="miagencia o URL completa"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400">Dejá en blanco los que no uses — no aparecerán en la landing.</p>
          </SectionCard>

          {/* Link a la landing pública */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-700">Ver landing pública</p>
              <p className="text-[11px] text-slate-400">/{agency.slug}</p>
            </div>
            <a href={`/${agency.slug}`} target="_blank"
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              <Globe size={12} /> Abrir
            </a>
          </div>

          <div className="h-4" /> {/* Bottom padding */}
        </div>
      </div>

      {/* ── PANEL DERECHO — PREVIEW ──────────────────────────────────────── */}
      <div className={`flex-1 h-full flex-col overflow-hidden ${mobileView === 'preview' ? 'flex' : 'hidden sm:flex'}`}>
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vista previa en vivo</span>
          <div className="flex gap-1.5 ml-auto">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto bg-white">
          <LandingAgencia initialData={previewData} />
        </div>
      </div>
    </div>
  );
}