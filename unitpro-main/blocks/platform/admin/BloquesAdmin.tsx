"use client";
// blocks/platform/admin/BloquesAdmin.tsx
// Muestra primero los bloques activos con su orden (drag & drop).
// El botón "Ver Tienda" abre BlockMarketplace como modal para activar/desactivar.

import { useState } from "react";
import { ShoppingBag, X } from "lucide-react";
import dynamic from "next/dynamic";
const BlockMarketplace    = dynamic(() => import("@/components/dashboards/BlockMarketplace"),    { ssr: false });
const SectionOrderManager = dynamic(() => import("@/components/dashboards/SectionOrderManager"), { ssr: false });
import type { BlockAdminProps } from "@/types/blocks";

const PRIMARY = "#577a2c";

export default function BloquesAdmin({ negocio }: BlockAdminProps) {
  const [showStore, setShowStore] = useState(false);

  return (
    <div className="animate-in fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Mis Bloques</h1>
          <p className="text-zinc-500 text-sm">Configurá el orden de secciones de tu página.</p>
        </div>
        <button
          onClick={() => setShowStore(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all hover:-translate-y-0.5 text-sm"
          style={{ backgroundColor: PRIMARY }}
        >
          <ShoppingBag size={16} /> Ver Tienda
        </button>
      </div>

      {/* Orden de secciones */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <SectionOrderManager negocioId={negocio.id} />
      </div>

      {/* Modal tienda */}
      {showStore && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
            <div className="sticky top-0 bg-white border-b border-zinc-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <ShoppingBag size={18} style={{ color: PRIMARY }} /> Tienda de Bloques
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">Activá o desactivá funcionalidades para tu negocio.</p>
              </div>
              <button onClick={() => setShowStore(false)}
                className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <BlockMarketplace negocioId={negocio.id} isAgency={false} onClose={() => setShowStore(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}