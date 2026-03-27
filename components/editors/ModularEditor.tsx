"use client";
// components/editors/ModularEditor.tsx
//
// Preview en vivo via postMessage (sin auto-save a DB).
// Igual que el legacy ConfirmBookingEditor.
// Solo toca Supabase cuando el usuario presiona "Guardar".

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Save, Monitor, Smartphone, ExternalLink,
  ChevronLeft, Loader2, Check, ChevronDown,
  Sparkles, Zap,
} from "lucide-react";
import { createClient }    from "@/lib/supabase";
import { BLOCKS_REGISTRY } from "@/blocks/_registry";
import type { BlockId, BlockEditorProps } from "@/types/blocks";
import { GOOGLE_FONTS } from "@/lib/fonts";
import { useWhitelabel } from "@/lib/hooks/useWhitelabel";
import SectionOrderManager from "@/components/dashboards/SectionOrderManager";

const PRIMARY = "#577a2c";

const DB_FIELDS = [
  "direccion", "horarios", "google_maps_link",
  "whatsapp", "instagram", "facebook", "linkedin",
] as const;

interface ModularEditorProps {
  negocio:  any;
  onClose:  () => void;
  onSaved?: () => void;
}

export default function ModularEditor({ negocio, onClose, onSaved }: ModularEditorProps) {
  const supabase = createClient();

  const [config, setConfig] = useState<any>(() => {
    const raw = negocio.config_web;
    if (!raw) return {};
    if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return {}; } }
    return { ...raw };
  });

  const [dbFields, setDbFields] = useState<any>(() =>
    Object.fromEntries(DB_FIELDS.map(f => [f, (negocio as any)[f] || ""]))
  );

  const [activeIds, setActiveIds] = useState<BlockId[]>([]);
  const [activeTab, setActiveTab] = useState<BlockId | "_order">("landing");
  const [viewMode,  setViewMode]  = useState<"desktop" | "mobile">("desktop");
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [dirty,     setDirty]     = useState(false);
  const [sectionOrder, setSectionOrder] = useState<BlockId[]>([]);
  const [editorMode, setEditorMode] = useState<'easy' | 'pro'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('unitpro_editor_mode') as 'easy' | 'pro') || 'easy';
    }
    return 'easy';
  });

  const wl = useWhitelabel(negocio.id, negocio.agency_id ?? null);

  // Apply whitelabel primary color as CSS variable whenever it changes
  useEffect(() => {
    if (wl.isWhitelabel && wl.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', wl.primaryColor);
    }
  }, [wl.primaryColor, wl.isWhitelabel]);

  const iframeRef   = useRef<HTMLIFrameElement>(null);
  const configRef   = useRef(config);
  const dbRef       = useRef(dbFields);
  const panelRef = useRef<HTMLDivElement>(null);
  configRef.current = config;
  dbRef.current     = dbFields;

  // URL del iframe siempre con ?preview=1 para activar LandingModularPreview
  const previewUrl = `/${negocio.slug}?preview=1`;
  // Link externo muestra la versión pública real
  const publicUrl  = `/${negocio.slug}`;

  // ── Persistir editorMode en localStorage ──────────────────────────────────
  useEffect(() => {
    localStorage.setItem('unitpro_editor_mode', editorMode);
  }, [editorMode]);

  // ── Cargar bloques activos ─────────────────────────────────────────────────
  useEffect(() => {
    supabase.from("tenant_blocks").select("block_id")
      .eq("negocio_id", negocio.id).eq("active", true)
      .then(({ data }) => {
        if (data) setActiveIds(data.map((b: any) => b.block_id as BlockId));
      });
  }, [negocio.id]);

  // ── PostMessage → preview instantáneo ─────────────────────────────────────
  // Cada vez que config o dbFields cambian, se lo mandamos al iframe.
  // NO tocamos Supabase hasta que el usuario guarda manualmente.
  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: "UPDATE_CONFIG", payload: configRef.current }, "*");
    win.postMessage({ type: "UPDATE_DB",     payload: dbRef.current },     "*");
    if (sectionOrder.length > 0) {
      win.postMessage({ type: "UPDATE_ORDER", payload: sectionOrder }, "*");
    }
  }, [config, dbFields, sectionOrder]);

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  // Al cargar el iframe, mandarle el estado inicial
  const handleIframeLoad = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage({ type: "UPDATE_CONFIG", payload: configRef.current }, "*");
    win.postMessage({ type: "UPDATE_DB",     payload: dbRef.current },     "*");
    if (sectionOrder.length > 0) {
      win.postMessage({ type: "UPDATE_ORDER", payload: sectionOrder }, "*");
    }
  };

  // ── Tabs del editor ───────────────────────────────────────────────────────
  const isAutogestionado = !negocio.agency_id;
  const blockPerms = negocio.block_edit_permissions as Record<string, boolean> | undefined;

  const editorTabs = [
    BLOCKS_REGISTRY.landing,
    ...Object.values(BLOCKS_REGISTRY)
      .filter(def =>
        def.id !== "landing" &&
        !!def.EditorPanel &&
        (def.alwaysActive || activeIds.includes(def.id) ||
          (def.priceUC === 0 && def.dependencies.length > 0 &&
          def.dependencies.every(dep => activeIds.includes(dep as BlockId)))) &&
        (isAutogestionado || blockPerms?.[def.id] !== false)
      )
      .sort((a, b) => (a.adminOrder ?? 99) - (b.adminOrder ?? 99)),
  ].filter(def => !!def.EditorPanel);

  // ── Helpers de mutación ───────────────────────────────────────────────────
  const updateConfig = useCallback((section: string, field: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    setDirty(true);
  }, []);

  const updateConfigRoot = useCallback((field: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [field]: value }));
    setDirty(true);
  }, []);

  const updateArray = useCallback((section: string, index: number, field: string, value: any) => {
    setConfig((prev: any) => {
      const items = [...(prev[section]?.items || [])];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, [section]: { ...prev[section], items } };
    });
    setDirty(true);
  }, []);

  const pushToArray = useCallback((section: string, item: any) => {
    setConfig((prev: any) => {
      const items = [...(prev[section]?.items || []), item];
      return { ...prev, [section]: { ...prev[section], items } };
    });
    setDirty(true);
  }, []);

  const removeFromArray = useCallback((section: string, index: number) => {
    setConfig((prev: any) => {
      const items = (prev[section]?.items || []).filter((_: any, i: number) => i !== index);
      return { ...prev, [section]: { ...prev[section], items } };
    });
    setDirty(true);
  }, []);

  const updateDb = useCallback((field: string, value: any) => {
    setDbFields((prev: any) => ({ ...prev, [field]: value }));
    setDirty(true);
  }, []);

  // ── Guardar manual ────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);

    // Guardar config_web del negocio
    const { error } = await supabase.from("negocios").update({
      config_web: config,
      ...Object.fromEntries(DB_FIELDS.map(f => [f, dbFields[f] || null])),
    }).eq("id", negocio.id);

    if (error) { setSaving(false); alert("Error al guardar: " + error.message); return; }

    // Si el orden cambió, guardarlo en tenant_blocks del landing
    if (sectionOrder.length > 0) {
      await supabase
        .from("tenant_blocks")
        .update({ config: { sectionOrder } })
        .eq("negocio_id", negocio.id)
        .eq("block_id", "landing");
    }

    setSaving(false);
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2500);
    onSaved?.();
  };

  const editorProps: BlockEditorProps = {
    negocio, config, dbFields,
    updateConfig, updateConfigRoot, updateArray,
    pushToArray, removeFromArray, updateDb,
    editorMode,
  };

  const ActivePanel = activeTab !== "_order" ? BLOCKS_REGISTRY[activeTab]?.EditorPanel : null;

  return (
    <div className="fixed inset-0 z-[100] flex font-sans text-zinc-900 overflow-hidden bg-zinc-100">

      {/* ── PREVIEW ──────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 flex-col h-full border-r border-zinc-300 relative">
        <div className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-5 shrink-0 shadow-sm z-10">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Vista previa</span>
          <div className="flex bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            <button onClick={() => setViewMode("desktop")}
              className={`p-2 rounded-md transition-all ${viewMode === "desktop" ? "bg-white shadow text-[#577a2c]" : "text-zinc-400 hover:text-zinc-600"}`}>
              <Monitor size={16} />
            </button>
            <button onClick={() => setViewMode("mobile")}
              className={`p-2 rounded-md transition-all ${viewMode === "mobile" ? "bg-white shadow text-[#577a2c]" : "text-zinc-400 hover:text-zinc-600"}`}>
              <Smartphone size={16} />
            </button>
          </div>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs font-bold text-zinc-500 hover:text-zinc-800 flex items-center gap-1 transition-colors">
            Ver página <ExternalLink size={12} />
          </a>
        </div>

        <div className="flex-1 bg-zinc-200 flex items-center justify-center p-6 overflow-hidden">
          <div className={`relative bg-white shadow-2xl border border-zinc-300 overflow-hidden transition-all duration-500 ${
            viewMode === "mobile"
              ? "w-[390px] h-[844px] rounded-[3rem] border-[10px] border-zinc-800 shadow-xl max-h-full"
              : "w-full h-full rounded-xl"
          }`}>
            <iframe
              ref={iframeRef}
              src={previewUrl}
              onLoad={handleIframeLoad}
              className="w-full h-full"
              style={{ border: "none" }}
              title="Preview"
            />
          </div>
        </div>
      </div>

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-[440px] bg-white flex flex-col h-full shadow-2xl shrink-0 border-l border-zinc-200">

        {/* Top bar */}
        <div className="h-14 px-4 border-b border-zinc-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-500 hover:text-zinc-800 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div>
              <p className="font-bold text-sm leading-tight truncate max-w-[180px]">{negocio.nombre}</p>
              <p className="text-xs text-zinc-400">Editor de página</p>
            </div>
          </div>
          <div className="flex bg-zinc-100 rounded-full p-0.5 border border-zinc-200">
            <button
              onClick={() => setEditorMode('easy')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs transition-all ${
                editorMode === 'easy'
                  ? 'bg-[#577a2c]/10 text-[#577a2c] font-bold'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <Sparkles size={12} /> Easy
            </button>
            <button
              onClick={() => setEditorMode('pro')}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs transition-all ${
                editorMode === 'pro'
                  ? 'bg-zinc-800 text-white font-bold'
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <Zap size={12} /> Pro
            </button>
          </div>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer"
            className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors lg:hidden">
            <ExternalLink size={16} />
          </a>
        </div>

        {/* Selector de bloque — dropdown */}
        <div className="border-b border-zinc-100 bg-zinc-50 px-4 py-3 shrink-0">
          <div className="relative">
            <select
              value={activeTab}
              onChange={e => setActiveTab(e.target.value as BlockId)}
              className="w-full appearance-none bg-white border border-zinc-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-bold text-zinc-800 outline-none focus:ring-2 focus:ring-[#577a2c]/30 cursor-pointer shadow-sm"
            >
              {editorTabs.map(def => (
                <option key={def.id} value={def.id}>
                  {def.editorLabel || def.name}
                </option>
              ))}
              <option value="_order">Orden de secciones</option>
            </select>
            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        {/* Panel activo */}
        <div ref={panelRef} className="flex-1 overflow-y-auto p-5 pb-24">
          {activeTab === "_order" ? (
            <SectionOrderManager
              negocioId={negocio.id}
              onOrderChange={(order) => { setSectionOrder(order); setDirty(true); }}
            />
          ) : ActivePanel ? (
            <ActivePanel {...editorProps} />
          ) : (
            <div className="p-12 text-center text-zinc-400 text-sm">
              Este bloque no tiene opciones de edición aún.
            </div>
          )}
        </div>

        {/* Footer — único botón de guardar */}
        <div className="absolute bottom-0 left-0 right-0 lg:relative p-4 bg-white border-t border-zinc-100 shrink-0">
          {dirty && !saved && (
            <p className="text-center text-[11px] text-amber-500 font-medium mb-2">
              Tenés cambios sin guardar
            </p>
          )}
          <button onClick={handleSave} disabled={saving || !dirty}
            className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              saved  ? "bg-green-50 text-green-700 border border-green-200" :
              !dirty ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" :
              "text-white hover:opacity-90"
            }`}
            style={!saved && dirty ? { backgroundColor: wl.isWhitelabel ? wl.primaryColor : PRIMARY } : {}}>
            {saving ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
             : saved ? <><Check size={16} /> ¡Guardado!</>
             : <><Save size={16} /> Guardar cambios</>}
          </button>
        </div>
      </div>
    </div>
  );
}