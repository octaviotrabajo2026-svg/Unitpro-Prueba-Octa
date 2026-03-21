"use client";

// components/dashboards/BlockMarketplace.tsx
// Panel donde el dueño del negocio activa/desactiva bloques.
// Sigue los patrones de UI de ServiceBookingDashboard.tsx

import { useEffect, useState } from "react";
import { toggleClientBlock } from "@/app/actions/admin/agency-actions";
import { createClient } from "@/lib/supabase";
import {
  Globe, CalendarDays, Users, Images, Star, BarChart2,
  CreditCard, MessageCircle, ShoppingCart, GraduationCap,
  Check, X, Loader2, ChevronRight, Zap, Lock, AlertTriangle,
  Bell, Puzzle, Megaphone, LayoutDashboard,
} from "lucide-react";
import { UCoin } from "@/components/ui/UnitCoin";
import {
  BLOCKS_REGISTRY,
  getAvailableBlocks,
  getBlocksByCategory,
  calculateMonthlyTotal,
  checkDependencies,
} from "@/blocks/_registry";
import type { BlockId, BlockStatus } from "@/types/blocks";

// ─── Mapa de íconos (tiene que coincidir con icon en _registry.ts) ────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  Globe:           <Globe size={20} />,
  CalendarDays:    <CalendarDays size={20} />,
  Users:           <Users size={20} />,
  Images:          <Images size={20} />,
  Star:            <Star size={20} />,
  BarChart2:       <BarChart2 size={20} />,
  CreditCard:      <CreditCard size={20} />,
  MessageCircle:   <MessageCircle size={20} />,
  ShoppingCart:    <ShoppingCart size={20} />,
  GraduationCap:   <GraduationCap size={20} />,
  Bell:            <Bell size={20} />,
  Puzzle:          <Puzzle size={20} />,
  Megaphone:       <Megaphone size={20} />,
  LayoutDashboard: <LayoutDashboard size={20} />,
};

const CATEGORY_LABELS: Record<string, string> = {
  core:      "Esencial",
  services:  "Servicios",
  marketing: "Marketing",
  commerce:  "Comercio",
  future:    "Próximamente",
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface BlockMarketplaceProps {
  negocioId: number;
  isAgency?: boolean; // Si true, muestra precios de agencia
  onClose?: () => void;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function BlockMarketplace({
  negocioId,
  isAgency = false,
  onClose,
}: BlockMarketplaceProps) {
  const supabase = createClient();

  const [activeBlockIds, setActiveBlockIds] = useState<BlockId[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<BlockId | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // ── Cargar bloques activos al montar ────────────────────────────────────────
  useEffect(() => {
    loadActiveBlocks();
  }, [negocioId]);

  async function loadActiveBlocks() {
    setLoading(true);
    const { data } = await supabase
      .from("tenant_blocks")
      .select("block_id")
      .eq("negocio_id", negocioId)
      .eq("active", true);

    setActiveBlockIds((data ?? []).map((b: { block_id: string }) => b.block_id as BlockId));
    setLoading(false);
  }

  // ── Toast helper ────────────────────────────────────────────────────────────
  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Toggle bloque (activa o desactiva) ──────────────────────────────────────
  async function handleToggle(blockId: BlockId) {
    const isActive = activeBlockIds.includes(blockId);
    setTogglingId(blockId);

    if (isActive) {
      // ── Desactivar: verificar que nadie depende de este ──────────────────
      const dependents = activeBlockIds.filter(
        (id) => BLOCKS_REGISTRY[id].dependencies.includes(blockId)
      );
      if (dependents.length > 0) {
        const names = dependents.map((id) => BLOCKS_REGISTRY[id].name).join(", ");
        showToast(`No podés desactivarlo. Lo requieren: ${names}`, "error");
        setTogglingId(null);
        return;
      }

      let deactivateError: string | null = null;
      if (isAgency) {
        const res = await toggleClientBlock(negocioId, blockId, false);
        if (!res.success) deactivateError = res.error ?? "Error";
      } else {
        const { error } = await supabase
          .from("tenant_blocks")
          .update({ active: false })
          .eq("negocio_id", negocioId)
          .eq("block_id", blockId);
        if (error) deactivateError = error.message;
      }

      if (deactivateError) {
        showToast("Error al desactivar el bloque", "error");
      } else {
        setActiveBlockIds((prev) => prev.filter((id) => id !== blockId));
        showToast(`${BLOCKS_REGISTRY[blockId].name} desactivado`, "success");
      }
    } else {
      // ── Activar: verificar dependencias ────────────────────────────────
      const { satisfied, missing } = checkDependencies(blockId, activeBlockIds);
      if (!satisfied) {
        const names = missing.map((id) => BLOCKS_REGISTRY[id].name).join(", ");
        showToast(`Primero activá: ${names}`, "error");
        setTogglingId(null);
        return;
      }

      let activateError: string | null = null;
      if (isAgency) {
        const res = await toggleClientBlock(negocioId, blockId, true);
        if (!res.success) activateError = res.error ?? "Error";
      } else {
        const { error } = await supabase
          .from("tenant_blocks")
          .upsert(
            { negocio_id: negocioId, block_id: blockId, active: true, activated_at: new Date().toISOString() },
            { onConflict: "negocio_id,block_id" }
          );
        if (error) activateError = error.message;
      }

      if (activateError) {
        showToast("Error al activar el bloque", "error");
      } else {
        setActiveBlockIds((prev) => [...prev, blockId]);
        showToast(`${BLOCKS_REGISTRY[blockId].name} activado 🎉`, "success");
      }
    }

    setTogglingId(null);
  }

  // ── Cálculo del total mensual ───────────────────────────────────────────────
  const totalARS = calculateMonthlyTotal(activeBlockIds, isAgency);
  const activeCount = activeBlockIds.length;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm animate-pulse">Cargando bloques...</p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="relative">

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-in slide-in-from-bottom-4 duration-300 ${
            toast.type === "success"
              ? "bg-[#577a2c] text-white"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {toast.type === "success"
            ? <Check size={16} className="text-green-400" />
            : <AlertTriangle size={16} />
          }
          {toast.message}
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">Mis Bloques</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Activá solo las funciones que necesitás para tu negocio.
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* ── Resumen de facturación ────────────────────────────────────────── */}
      <div className="bg-zinc-900 rounded-2xl p-5 mb-8 flex items-center justify-between">
        <div>
          <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider mb-1">
            Total mensual estimado
          </p>
          <div className="flex items-baseline gap-2">
            <UCoin amount={totalARS} size="lg" />
            <span className="text-zinc-400 text-sm">/ mes</span>
          </div>
          <p className="text-zinc-500 text-xs mt-1">
            {activeCount} bloque{activeCount !== 1 ? "s" : ""} activo{activeCount !== 1 ? "s" : ""}
            {isAgency && (
              <span className="ml-2 bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full text-xs">
                Precio agencia
              </span>
            )}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1">
          <Zap size={16} className="text-yellow-400" />
          <span className="text-zinc-400 text-xs">Cambios en tiempo real</span>
        </div>
      </div>

      {/* ── Bloques por categoría ─────────────────────────────────────────── */}
      <div className="space-y-8">
        {Object.entries(getBlocksByCategory()).map(([category, blocks]) => (
          <div key={category}>
            {/* Título de categoría */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                {CATEGORY_LABELS[category] ?? category}
              </span>
              <div className="flex-1 h-px bg-zinc-100" />
            </div>

            {/* Grid de bloques */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {blocks.map((block) => {
                const isActive = activeBlockIds.includes(block.id);
                const isToggling = togglingId === block.id;
                const isCore = block.alwaysActive === true;
                const isComingSoon = block.comingSoon === true;
                const price = isAgency ? block.agencyPriceUC : block.priceUC;

                // Verificar si tiene dependencias no cumplidas
                const { satisfied: depsOk, missing } = checkDependencies(
                  block.id,
                  activeBlockIds
                );
                const hasMissingDeps = !isActive && !depsOk && !isComingSoon;

                return (
                  <div
                    key={block.id}
                    className={`relative rounded-xl border p-4 transition-all duration-200 ${
                      isActive
                        ? "border-[#577a2c] bg-white shadow-sm"
                        : "border-zinc-200 bg-white hover:border-zinc-300"
                    } ${isCore ? "opacity-90 cursor-default" : ""}`}
                  >
                    {/* Indicador activo */}
                    {isActive && (
                      <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[#8dbb38]" />
                    )}

                    <div className="flex items-start gap-3">
                      {/* Ícono */}
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive
                            ? "bg-[#577a2c] text-white"
                            : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {ICON_MAP[block.icon] ?? <Zap size={20} />}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-zinc-900 text-sm">
                            {block.name}
                          </span>
                          {isCore && (
                            <span className="text-[10px] font-bold uppercase tracking-wide bg-zinc-900 text-white px-2 py-0.5 rounded-full">
                              Incluido
                            </span>
                          )}
                          {isComingSoon && (
                            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Zap size={10} />
                              En desarrollo
                            </span>
                          )}
                          {hasMissingDeps && (
                            <span className="text-[10px] font-medium text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Lock size={10} />
                              Requiere {missing.map((id) => BLOCKS_REGISTRY[id].name).join(", ")}
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-500 text-xs mt-0.5 leading-relaxed">
                          {block.description}
                        </p>

                        {/* Precio y botón */}
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-sm font-bold text-zinc-900">
                          <UCoin amount={price} size="sm" showLabel={price > 0} />
                          </span>

                          {/* Botón toggle — oculto si es comingSoon */}
                          {!isCore && !isComingSoon && (
                            <button
                              onClick={() => handleToggle(block.id)}
                              disabled={isToggling || hasMissingDeps}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                                isActive
                                  ? "bg-zinc-100 text-zinc-700 hover:bg-red-50 hover:text-red-600"
                                  : hasMissingDeps
                                  ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                                  : "bg-[#577a2c] text-white hover:bg-[#486423]"
                              }`}
                            >
                              {isToggling ? (
                                <Loader2 size={12} className="animate-spin" />
                              ) : isActive ? (
                                <>
                                  <X size={12} />
                                  Desactivar
                                </>
                              ) : (
                                <>
                                  <Check size={12} />
                                  Activar
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* ── Bloques futuros ─────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">
              Próximamente
            </span>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.values(BLOCKS_REGISTRY)
              .filter((b) => !b.available)
              .map((block) => (
                <div
                  key={block.id}
                  className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-4 opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-200 text-zinc-400 flex items-center justify-center shrink-0">
                      {ICON_MAP[block.icon] ?? <Zap size={20} />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-500 text-sm">
                          {block.name}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wide bg-zinc-200 text-zinc-500 px-2 py-0.5 rounded-full">
                          Próximamente
                        </span>
                      </div>
                      <p className="text-zinc-400 text-xs mt-0.5">{block.description}</p>
                      <p className="text-xs font-bold text-zinc-400 mt-2">
                        Desde <UCoin amount={isAgency ? block.agencyPriceUC : block.priceUC} size="xs" showLabel /> 
                      </p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ── Footer informativo ────────────────────────────────────────────── */}
      <div className="mt-8 p-4 bg-zinc-50 rounded-xl border border-zinc-100 flex items-start gap-3">
        <AlertTriangle size={16} className="text-zinc-400 shrink-0 mt-0.5" />
        <p className="text-zinc-500 text-xs leading-relaxed">
          Los cambios se aplican de forma inmediata. La facturación se ajusta
          automáticamente al inicio de cada período según los bloques activos en ese momento.
        </p>
      </div>
    </div>
  );
}