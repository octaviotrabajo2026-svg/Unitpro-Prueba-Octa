"use client";
// blocks/about/editor/AboutPanel.tsx
// Panel de edición para la sección "Quiénes Somos".

import type { BlockEditorProps } from "@/types/blocks";
import { ImageUpload } from "@/components/ui/ImageUpload";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">{children}</label>;
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-zinc-200 rounded-xl p-4 space-y-4">
      <h3 className="font-bold text-sm text-zinc-700">{title}</h3>
      {children}
    </div>
  );
}

export default function AboutPanel({ config, updateConfigRoot }: BlockEditorProps) {
  const about = (config.about as Record<string, string> | undefined) || {};

  const update = (field: string, value: string) =>
    updateConfigRoot("about", { ...about, [field]: value });

  return (
    <SectionCard title="Quiénes Somos">
      <div>
        <Label>Título</Label>
        <input
          value={about.titulo ?? ""}
          onChange={e => update("titulo", e.target.value)}
          placeholder="Quiénes Somos"
          className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none text-zinc-900"
        />
      </div>

      <div>
        <Label>Texto (HTML básico permitido)</Label>
        <textarea
          rows={6}
          value={about.texto ?? ""}
          onChange={e => update("texto", e.target.value)}
          placeholder="<p>Somos un equipo dedicado a...</p>"
          className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none resize-none text-zinc-900"
        />
      </div>

      <ImageUpload
        label="Imagen (opcional)"
        value={about.imagenUrl ?? ""}
        onChange={url => update("imagenUrl", url)}
      />
    </SectionCard>
  );
}
