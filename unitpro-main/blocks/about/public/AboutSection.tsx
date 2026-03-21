"use client";
// blocks/about/public/AboutSection.tsx
// Sección "Quiénes Somos": título + texto HTML + imagen opcional en grid 2 columnas.

import type { BlockSectionProps } from "@/types/blocks";
import { SafeHTML } from "@/components/ui/SafeHTML";

export default function AboutSection({ negocio, config: blockConfig }: BlockSectionProps) {
  const raw = negocio?.config_web || {};
  const about = (raw.about as Record<string, string> | undefined) || {};

  const titulo    = (blockConfig?.titulo    as string) ?? about.titulo    ?? "Quiénes Somos";
  const texto     = (blockConfig?.texto     as string) ?? about.texto     ?? "";
  const imagenUrl = (blockConfig?.imagenUrl as string) ?? about.imagenUrl ?? "";

  const brandColor = (raw.colors?.primary as string) || negocio?.color_principal || "#577a2c";
  const textColor  = (raw.colors?.text    as string) || "#1f2937";
  const bg         = raw.colors?.secondary as string | undefined;

  const radiusMap: Record<string, string> = {
    none: "rounded-none", small: "rounded-lg", medium: "rounded-2xl", large: "rounded-3xl",
  };
  const radiusClass = radiusMap[(raw.appearance as any)?.radius ?? "medium"] ?? "rounded-2xl";

  if (!titulo && !texto && !imagenUrl) return null;

  return (
    <section className="py-16 px-4" style={bg ? { backgroundColor: bg } : {}}>
      <div className="max-w-5xl mx-auto">
        <div className={`grid ${imagenUrl ? "md:grid-cols-2" : "grid-cols-1"} gap-10 items-center`}>
          {/* Texto */}
          <div className="space-y-4">
            {titulo && (
              <h2 className="text-3xl font-extrabold" style={{ color: brandColor }}>
                {titulo}
              </h2>
            )}
            {texto && (
              <div className="prose max-w-none leading-relaxed" style={{ color: textColor }}>
                <SafeHTML html={texto} />
              </div>
            )}
          </div>

          {/* Imagen */}
          {imagenUrl && (
            <div className={`overflow-hidden shadow-xl ${radiusClass}`}>
              <img
                src={imagenUrl}
                alt={titulo}
                className="w-full h-72 object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
