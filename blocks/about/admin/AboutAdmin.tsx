"use client";
// blocks/about/admin/AboutAdmin.tsx
// Sin lógica admin específica — la sección se configura desde el editor.

import type { BlockAdminProps } from "@/types/blocks";

export default function AboutAdmin({ negocio }: BlockAdminProps) {
  return (
    <div className="p-6 text-center text-zinc-400 text-sm">
      <p>La sección "Quiénes Somos" se configura desde el <strong>Editor de Página</strong>.</p>
    </div>
  );
}
