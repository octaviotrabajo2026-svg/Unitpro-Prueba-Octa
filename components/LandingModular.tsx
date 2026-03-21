// components/LandingModular.tsx
// Server Component — lee bloques activos, respeta el orden configurado.
// Cuando isPreview=true delega en LandingModularPreview (Client Component)
// que escucha postMessage del editor para mostrar cambios sin guardar.

import { createClient } from "@/lib/supabase-server";
import { BLOCKS_REGISTRY } from "@/blocks/_registry";
import LandingModularPreview from "@/components/LandingModularPreview";
import type { BlockId } from "@/types/blocks";
import DynamicFont from "@/components/ui/DynamicFont";

interface LandingModularProps {
  negocio:   any;
  isPreview?: boolean;
}

export default async function LandingModular({ negocio, isPreview = false }: LandingModularProps) {
  const supabase = await createClient();

  const { data: tenantBlocks } = await supabase
    .from("tenant_blocks")
    .select("block_id, active, config")
    .eq("negocio_id", negocio.id)
    .eq("active", true);

  const activeBlocks = tenantBlocks ?? [];

  if (activeBlocks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-zinc-400 text-sm">Este negocio aún no tiene bloques activos.</p>
      </div>
    );
  }

  const landingBlock = activeBlocks.find(b => b.block_id === "landing");
  const savedOrder: BlockId[] = (landingBlock?.config?.sectionOrder as BlockId[]) ?? [];
  const activeIds = activeBlocks.map(b => b.block_id as BlockId);

  const ordered: BlockId[] = [
    "landing",
    ...savedOrder.filter(id => id !== "landing" && activeIds.includes(id)),
    ...activeIds.filter(id => id !== "landing" && !savedOrder.includes(id)),
  ];

  // Modo preview: Client Component que escucha postMessage del editor
  if (isPreview) {
    return (
      <LandingModularPreview
        negocio={negocio}
        activeBlocks={activeBlocks}
        ordered={ordered}
      />
    );
  }

  // Modo normal: Server Component estático
  const raw      = negocio?.config_web || {};
  const bgColor  = raw.colors?.secondary || "#ffffff";
  const txtColor = raw.colors?.text       || "#1f2937";

  const selectedFont = raw.appearance?.font || "Inter";

  return (
    <div className="custom-font-wrapper" style={{ backgroundColor: bgColor, color: txtColor, minHeight: "100vh" }}>
      
      {/* 👇 Inyectamos la fuente 👇 */}
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