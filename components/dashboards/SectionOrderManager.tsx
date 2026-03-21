"use client";
// components/dashboards/SectionOrderManager.tsx
// Permite al dueño reordenar las secciones de su landing modular.
// Guarda el orden en tenant_blocks.config del bloque 'landing'.
// La HeroSection siempre es primera — no se puede mover.

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { GripVertical, Check, Loader2, Lock } from "lucide-react";
import type { BlockId } from "@/types/blocks";

// IDs de bloques que tienen SectionComponent (sección pública en la landing).
// Lista estática para evitar importar _registry y crear una dependencia circular:
// _registry → dynamic(BloquesAdmin) → dynamic(SectionOrderManager) → static(_registry)
const BLOCKS_WITH_SECTION = new Set<BlockId>([
  "landing", "about", "calendar", "crm", "reviews", "gallery", "shop", "academy",
]);

const ICON_LABELS: Record<string, string> = {
  landing:   "🏠 Hero / Navbar",
  about:     "👥 Quiénes Somos",
  calendar:  "📅 Servicios & Turnos",
  gallery:   "🖼️ Galería",
  reviews:   "⭐ Valoraciones",
  crm:       "📍 Contacto & Ubicación",
  analytics: "📊 Analytics",
  chat:      "💬 Chat",
};

interface SectionOrderManagerProps {
  negocioId: number;
}

export default function SectionOrderManager({ negocioId }: SectionOrderManagerProps) {
  const supabase = createClient();

  const [order, setOrder]       = useState<BlockId[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [dragIdx, setDragIdx]   = useState<number | null>(null);

  // ── Cargar orden actual ───────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      // 1. Bloques activos del negocio
      const { data: activeBlocks } = await supabase
        .from("tenant_blocks")
        .select("block_id, config")
        .eq("negocio_id", negocioId)
        .eq("active", true);

      if (!activeBlocks?.length) { setLoading(false); return; }

      const activeIds = activeBlocks.map(b => b.block_id as BlockId)
        .filter(id => BLOCKS_WITH_SECTION.has(id))

      // 2. Orden guardado en config del bloque landing
      const landingBlock = activeBlocks.find(b => b.block_id === "landing");
      const savedOrder: BlockId[] = (landingBlock?.config?.sectionOrder as BlockId[]) ?? [];

      // 3. Mismo algoritmo que LandingModular: landing primero, luego savedOrder, luego nuevos
      const finalOrder: BlockId[] = [
        "landing",
        ...savedOrder.filter(id => id !== "landing" && activeIds.includes(id)),
        ...activeIds.filter(id => id !== "landing" && !savedOrder.includes(id)),
      ];

      setOrder(finalOrder);
      setLoading(false);
    }
    load();
  }, [negocioId]);

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDragStart = (idx: number) => {
    if (idx === 0) return; // hero bloqueada
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (idx === 0 || dragIdx === null || dragIdx === idx) return;

    setOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  };

  const handleDragEnd = () => setDragIdx(null);

  // ── Guardar ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);

    const { error } = await supabase
      .from("tenant_blocks")
      .update({ config: { sectionOrder: order } })
      .eq("negocio_id", negocioId)
      .eq("block_id", "landing");

    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="animate-spin text-zinc-300" size={24} />
    </div>
  );

  if (order.length === 0) return (
    <p className="text-zinc-400 text-sm text-center py-8">
      Activá bloques desde "Mis Bloques" para configurar el orden.
    </p>
  );

  return (
    <div>
      <div className="mb-4">
        <h3 className="font-bold text-zinc-900 text-sm">Orden de secciones</h3>
        <p className="text-zinc-500 text-xs mt-1">
          Arrastrá las secciones para cambiar el orden en la web pública.
        </p>
      </div>

      <div className="space-y-2 mb-6">
        {order.map((blockId, idx) => {
          const isHero   = idx === 0;
          const isDragging = dragIdx === idx;

          return (
            <div
              key={blockId}
              draggable={!isHero}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-all select-none ${
                isHero
                  ? "bg-zinc-50 border-zinc-200 cursor-default opacity-70"
                  : isDragging
                  ? "bg-[#577a2c]/5 border-[#577a2c] shadow-md scale-[1.01]"
                  : "bg-white border-zinc-200 hover:border-zinc-300 cursor-grab active:cursor-grabbing hover:shadow-sm"
              }`}
            >
              {/* Ícono drag o lock */}
              <div className="text-zinc-300 shrink-0">
                {isHero
                  ? <Lock size={14} className="text-zinc-400" />
                  : <GripVertical size={18} />
                }
              </div>

              {/* Número */}
              <span className={`text-xs font-bold w-5 text-center shrink-0 ${
                isHero ? "text-zinc-400" : "text-zinc-500"
              }`}>
                {idx + 1}
              </span>

              {/* Nombre */}
              <span className="text-sm font-medium text-zinc-700 flex-1">
                {ICON_LABELS[blockId] ?? blockId}
              </span>

              {/* Badge fijo */}
              {isHero && (
                <span className="text-[10px] font-bold bg-zinc-200 text-zinc-500 px-2 py-0.5 rounded-full">
                  Siempre primera
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Botón guardar */}
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
          saved
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-zinc-900 text-white hover:bg-zinc-700"
        } disabled:opacity-60`}
      >
        {saving ? (
          <><Loader2 size={14} className="animate-spin" /> Guardando...</>
        ) : saved ? (
          <><Check size={14} /> Guardado</>
        ) : (
          "Guardar orden"
        )}
      </button>
    </div>
  );
}