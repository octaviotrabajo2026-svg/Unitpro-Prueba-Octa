"use client";
// blocks/landing/editor/LandingPanel.tsx
// Paneles: Identidad + Apariencia + Portada (Hero) + Metadata
// Identidad y Metadata son Pro-only.
// Apariencia y Portada siempre visibles — contenido varía según editorMode.

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { ImageUpload } from "@/components/ui/ImageUpload";
import type { BlockEditorProps } from "@/types/blocks";
import { GOOGLE_FONTS } from "@/lib/fonts";


const PRIMARY = "#577a2c";

// Fuentes que clasifican como "Serif" en el selector simplificado
const SERIF_FONTS = [
  "Playfair Display", "Lora", "Merriweather", "Bitter",
  "PT Serif", "Libre Baskerville", "Crimson Text", "Zilla Slab",
];

// Fuentes que clasifican como "Geométrica" en el selector simplificado
const GEO_FONTS = ["Space Grotesk", "Outfit", "Space Mono"];

// Devuelve la categoría simplificada de la fuente activa
function getFontCategory(font: string): "sans" | "serif" | "geo" {
  if (SERIF_FONTS.includes(font)) return "serif";
  if (GEO_FONTS.includes(font)) return "geo";
  return "sans";
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────
function SectionHeader({ title, color = "zinc" }: { title: string; color?: string }) {
  const dot: Record<string, string> = {
    zinc: "bg-zinc-400", indigo: "bg-indigo-500", emerald: "bg-emerald-500",
    purple: "bg-purple-500", orange: "bg-orange-500",
  };
  return (
    <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 mb-4">
      <span className={`w-2 h-2 rounded-full shrink-0 ${dot[color] ?? dot.zinc}`} />
      <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">{title}</h3>
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">{children}</label>;
}
function Input({ value, onChange, placeholder, type = "text" }: any) {
  return (
    <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none" />
  );
}
function Textarea({ value, onChange, rows = 3, placeholder }: any) {
  return (
    <textarea rows={rows} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none resize-none" />
  );
}
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? "bg-[#577a2c]" : "bg-zinc-300"}`}>
      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  );
}
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between p-2 border border-zinc-200 rounded-lg bg-zinc-50">
      <span className="text-xs font-medium text-zinc-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-zinc-400 font-mono uppercase">{value}</span>
        <input type="color" value={value || "#000000"} onChange={e => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-none bg-transparent" />
      </div>
    </div>
  );
}

// ─── Panel principal ──────────────────────────────────────────────────────────
export default function LandingPanel({ negocio, config, updateConfig, updateConfigRoot, editorMode }: BlockEditorProps) {
  // Normalizar editorMode — por defecto easy
  const mode = editorMode ?? 'easy';

  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showMsg = (text: string, type: 'success' | 'error' | 'warning') => {
    setAiMsg({ text, type });
    setTimeout(() => setAiMsg(null), 3500);
  };

  // Genera título, subtítulo y CTA del hero usando IA (consume 1 UC)
  const handleGenerateHero = async () => {
    setAiLoading(true);
    try {
      const services: string[] = ((config.servicios as any)?.items || [])
        .map((s: any) => s.titulo).filter(Boolean);
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hero', params: { businessName: negocio.nombre, services }, negocioId: negocio.id }),
      });
      const data = await res.json();
      if (res.status === 402) { showMsg('No tenés UnitCoins suficientes.', 'warning'); return; }
      if (!data.success) { showMsg('Error al generar texto.', 'error'); return; }
      updateConfig('hero', 'titulo', data.result.titulo);
      updateConfig('hero', 'subtitulo', data.result.subtitulo);
      updateConfig('hero', 'ctaTexto', data.result.cta);
      showMsg(`✨ Texto generado — 1 UC usado (saldo: ${data.newBalance} UC)`, 'success');
    } catch {
      showMsg('Error de conexión.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const hero       = config.hero       || {};
  const colors     = config.colors     || {};
  const appearance = config.appearance || {};
  const seo        = config.seo        || {};

  // Categoría activa de fuente para el selector simplificado
  const fontCategory = getFontCategory(appearance.font || "Inter");

  return (
    <div className="space-y-8">

      {/* ── PRO: Identidad ─────────────────────────────────────────────── */}
      {mode === 'pro' && (
        <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm">
          <SectionHeader title="Identidad" color="orange" />
          <ImageUpload
            label="Logo"
            value={config.logoUrl}
            onChange={url => updateConfigRoot("logoUrl", url)}
          />
        </section>
      )}

      {/* ── Apariencia — siempre visible, contenido varía ──────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <SectionHeader title="Apariencia" color="purple" />

        {/* Colores — color principal siempre visible */}
        <div className="space-y-2">
          <Label>Paleta de colores</Label>
          <ColorRow label="Principal" value={colors.primary || "#000000"}
            onChange={v => updateConfig("colors", "primary", v)} />

          {/* PRO: colores adicionales */}
          {mode === 'pro' && (
            <>
              <ColorRow label="Fondo / Secundario" value={colors.secondary || "#f3f4f6"}
                onChange={v => updateConfig("colors", "secondary", v)} />
              <ColorRow label="Texto" value={colors.text || "#1f2937"}
                onChange={v => updateConfig("colors", "text", v)} />
              <ColorRow label="Botón CTA" value={colors.button || "#577a2c"}
                onChange={v => updateConfig("colors", "button", v)} />
            </>
          )}
        </div>

        {/* Tipografía — Easy: 3 pills | Pro: dropdown completo */}
        <div>
          <Label>Tipografía</Label>
          {mode === 'easy' ? (
            <div className="flex gap-2">
              {([
                ["sans", "Sans", "Inter"],
                ["serif", "Serif", "Playfair Display"],
                ["geo", "Geométrica", "Space Grotesk"],
              ] as const).map(([cat, label, fontValue]) => (
                <button
                  key={cat}
                  onClick={() => updateConfig("appearance", "font", fontValue)}
                  className={`flex-1 py-2 text-xs border rounded-lg transition-all font-medium ${
                    fontCategory === cat
                      ? "border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold"
                      : "bg-white text-zinc-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <select
              value={appearance.font || "Inter"}
              onChange={e => updateConfig("appearance", "font", e.target.value)}
              className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white outline-none"
            >
              {GOOGLE_FONTS.map((group) => (
                <optgroup key={group.category} label={group.category} className="font-bold text-zinc-400 italic bg-zinc-50">
                  {group.fonts.map((fontName) => (
                    <option
                      key={fontName}
                      value={fontName}
                      style={{ fontFamily: `"${fontName}", sans-serif` }}
                      className="text-zinc-800 font-normal not-italic bg-white"
                    >
                      {fontName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </div>

        {/* PRO: selector de bordes */}
        {mode === 'pro' && (
          <div>
            <Label>Bordes</Label>
            <div className="flex gap-2">
              {([["none","Recto"],["medium","Redondeado"],["full","Circular"]] as const).map(([val, label]) => (
                <button key={val} onClick={() => updateConfig("appearance", "radius", val)}
                  className={`flex-1 py-2 text-xs border rounded-lg transition-all font-medium ${appearance.radius === val ? "border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold" : "bg-white text-zinc-500"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Portada (Hero) — siempre visible ───────────────────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">Portada</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateHero}
              disabled={aiLoading}
              title="Generar texto con IA (1 UC)"
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border border-zinc-200 text-zinc-500 hover:border-[#577a2c] hover:text-[#577a2c] hover:bg-[#577a2c]/5 transition-all disabled:opacity-50"
            >
              {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
              {aiLoading ? 'Generando...' : 'IA'}
            </button>
            <Toggle value={!!hero.mostrar} onChange={v => updateConfig("hero", "mostrar", v)} />
          </div>
        </div>

        {aiMsg && (
          <div className={`text-xs px-3 py-2 rounded-lg font-medium ${
            aiMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            aiMsg.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {aiMsg.text}
          </div>
        )}

        {hero.mostrar !== false && (
          <div className="space-y-4 animate-in fade-in">

            {/* PRO: selector de layout */}
            {mode === 'pro' && (
              <div>
                <Label>Diseño</Label>
                <div className="flex gap-2">
                  {([["split","Dividido"],["full","Cinemático"]] as const).map(([val, label]) => (
                    <button key={val} onClick={() => updateConfig("hero", "layout", val)}
                      className={`flex-1 py-2 text-xs border rounded-lg transition-all font-medium ${(hero.layout || "split") === val ? "border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold" : "bg-white text-zinc-500"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* PRO: parallax + overlay (solo cuando layout = full) */}
            {mode === 'pro' && hero.layout === "full" && (
              <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Efecto Parallax</Label>
                  <Toggle value={!!hero.parallax} onChange={v => updateConfig("hero", "parallax", v)} />
                </div>
                <div>
                  <Label>Oscuridad de overlay ({hero.overlayOpacity ?? 50}%)</Label>
                  <input type="range" min="0" max="90" value={hero.overlayOpacity ?? 50}
                    onChange={e => updateConfig("hero", "overlayOpacity", Number(e.target.value))}
                    className="w-full accent-[#577a2c]" />
                </div>
              </div>
            )}

            {/* Campos de texto — siempre visibles */}
            <div>
              <Label>Título principal</Label>
              <Input value={hero.titulo} onChange={(v: string) => updateConfig("hero", "titulo", v)}
                placeholder="Tu nombre o negocio" />
            </div>
            <div>
              <Label>Descripción breve</Label>
              <Textarea value={hero.subtitulo} onChange={(v: string) => updateConfig("hero", "subtitulo", v)}
                placeholder="Una frase que describa lo que hacés" />
            </div>
            <div>
              <Label>Texto del botón CTA</Label>
              <Input value={hero.ctaTexto} onChange={(v: string) => updateConfig("hero", "ctaTexto", v)}
                placeholder="Reservar Turno" />
            </div>

            {/* PRO: imagen de fondo */}
            {mode === 'pro' && (
              <ImageUpload
                label="Imagen de fondo"
                value={hero.imagenUrl}
                onChange={url => updateConfig("hero", "imagenUrl", url)}
              />
            )}
          </div>
        )}
      </section>

      {/* ── PRO: Metadata SEO ──────────────────────────────────────────── */}
      {mode === 'pro' && (
        <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
          <SectionHeader title="Metadata" color="emerald" />
          <div>
            <Label>Título SEO</Label>
            <Input value={seo.titulo} onChange={(v: string) => updateConfig("seo", "titulo", v)}
              placeholder="Título que aparece en Google" />
          </div>
          <div>
            <ImageUpload
              label="Favicon"
              value={seo.favicon}
              onChange={(url: string) => updateConfig("seo", "favicon", url)}
            />
          </div>
        </section>
      )}
    </div>
  );
}
