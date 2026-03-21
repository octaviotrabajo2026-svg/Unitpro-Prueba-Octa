"use client";
// components/LandingModularPreview.tsx
//
// Versión CLIENT del landing modular — solo se usa cuando el iframe del editor
// carga la página con ?preview=1.
//
// Escucha postMessage del editor padre y actualiza el negocio en memoria,
// igual que ConfirmBookingLanding hace con el legacy.
// NUNCA escribe en Supabase — eso lo hace el editor al guardar.

import { useEffect, useState } from "react";
import { BLOCKS_REGISTRY } from "@/blocks/_registry";
import type { BlockId } from "@/types/blocks";
import DynamicFont from "@/components/ui/DynamicFont";

interface Props {
  negocio:      any;
  activeBlocks: { block_id: string; config: any }[];
  ordered:      BlockId[];
}

export default function LandingModularPreview({ negocio: initialNegocio, activeBlocks, ordered }: Props) {
  const [negocio, setNegocio] = useState(initialNegocio);

  // Escuchar mensajes del editor
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "UPDATE_CONFIG") {
        // El editor mandó un nuevo config_web completo
        setNegocio((prev: any) => ({ ...prev, config_web: event.data.payload }));
      }
      if (event.data?.type === "UPDATE_DB") {
        // El editor mandó campos de DB (direccion, whatsapp, etc.)
        setNegocio((prev: any) => ({ ...prev, ...event.data.payload }));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const raw      = negocio?.config_web || {};
  const bgColor  = raw.colors?.secondary || "#ffffff";
  const txtColor = raw.colors?.text       || "#1f2937";

  const selectedFont = raw.appearance?.font || "Inter";

  return (
    <div className="custom-font-wrapper" style={{ backgroundColor: bgColor, color: txtColor, minHeight: "100vh" }}>

      <DynamicFont font={selectedFont} />

      {ordered.map(blockId => {
        const definition = BLOCKS_REGISTRY[blockId];
        if (!definition?.SectionComponent) return null;

        const dbBlock = activeBlocks.find(b => b.block_id === blockId);
        const Section = definition.SectionComponent;

        return (
          <Section
            key={blockId}
            negocio={negocio}
            config={dbBlock?.config ?? {}}
          />
        );
      })}
    </div>
  );
}