"use client";
// blocks/equipo/public/EquipoSection.tsx

import { Instagram, Users } from "lucide-react";
import type { BlockSectionProps } from "@/types/blocks";

export default function EquipoSection({ negocio, config: blockConfig }: BlockSectionProps) {
  const raw = negocio?.config_web || {};
  const cfg = {
    equipo: { mostrar: true, titulo: "Nuestro Equipo", items: [], ...raw.equipo, ...(blockConfig?.equipo as object) },
    colors: { primary: negocio?.color_principal || "#000000", ...raw.colors },
    appearance: { radius: "medium", ...raw.appearance },
  };

  const equipo: any[] = (cfg.equipo as any).items || [];
  const titulo: string = (cfg.equipo as any).titulo || "Nuestro Equipo";
  const textColor = (raw.colors?.text as string) || "#1f2937";
  const r = (cfg.appearance as any).radius as string;
  const cardRadius = { none: "rounded-none", medium: "rounded-2xl", full: "rounded-3xl" }[r] ?? "rounded-2xl";

  if (!equipo.length) return null;

  return (
    <section id="equipo" className="py-24 px-6 bg-zinc-50 border-t border-zinc-200">
      <div className="max-w-7xl mx-auto text-center mb-12">
        <h2 className="text-3xl font-bold mt-2 mb-4" style={{ color: textColor }}>{titulo}</h2>
      </div>
      <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-8">
        {equipo.map((item: any, i: number) => (
          <div key={item.id || i}
            className={`w-full sm:w-[calc(50%-2rem)] md:w-[280px] flex flex-col items-center text-center p-6 bg-white shadow-sm border border-zinc-100 hover:shadow-lg hover:-translate-y-1 transition-all ${cardRadius}`}>
            <div className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-zinc-100 border-2 border-white shadow-md">
              {item.photoUrl ? (
                <img src={item.photoUrl} className="w-full h-full object-cover" alt={item.nombre} />
              ) : (
                <Users className="w-full h-full p-6 text-zinc-300" />
              )}
            </div>
            <h3 className="font-bold text-lg text-zinc-900">{item.nombre}</h3>
            <p className="text-zinc-500">{item.role}</p>
            {item.instagram && (
              <a
                href={`https://instagram.com/${item.instagram.replace("@", "").trim()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 bg-pink-50 text-pink-600 rounded-full text-xs font-bold hover:bg-pink-100 hover:-translate-y-0.5 transition-all border border-pink-100"
              >
                <Instagram size={14} />
                {item.instagram.startsWith("@") ? item.instagram : `@${item.instagram}`}
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}