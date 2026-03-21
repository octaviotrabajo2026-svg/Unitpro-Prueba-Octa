"use client";
// blocks/crm/editor/CrmPanel.tsx
// Panel: Información de Contacto (dirección, WhatsApp, redes, maps, horarios legibles)

import { MapPin, Phone, Instagram, Facebook, Linkedin, Globe, ExternalLink } from "lucide-react";
import type { BlockEditorProps } from "@/types/blocks";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">{children}</label>;
}
function InputRow({ icon, label, value, onChange, placeholder, type = "text" }: any) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <div className="absolute left-2.5 top-2.5 text-zinc-400">{icon}</div>
        <input type={type} value={value || ""} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-2 pl-8 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none" />
      </div>
    </div>
  );
}

export default function CrmPanel({ dbFields, updateDb }: BlockEditorProps) {
  return (
    <div className="space-y-8">
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">Información de Contacto</h3>
        </div>

        <InputRow icon={<MapPin size={14} />} label="Dirección"
          value={dbFields.direccion} onChange={(v: string) => updateDb("direccion", v)}
          placeholder="Ej: Av. Corrientes 1234, CABA" />

        <InputRow icon={<ExternalLink size={14} />} label="Link Google Maps"
          value={dbFields.google_maps_link} onChange={(v: string) => updateDb("google_maps_link", v)}
          placeholder="https://maps.google.com/..." />

        <InputRow icon={<Phone size={14} />} label="Teléfono / WhatsApp"
          value={dbFields.whatsapp} onChange={(v: string) => updateDb("whatsapp", v)}
          placeholder="5491112345678" />
      </section>

      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
          <span className="w-2 h-2 rounded-full bg-pink-500" />
          <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">Redes Sociales</h3>
        </div>

        <InputRow icon={<Instagram size={14} />} label="Instagram"
          value={dbFields.instagram} onChange={(v: string) => updateDb("instagram", v)}
          placeholder="@usuario o URL completa" />

        <InputRow icon={<Facebook size={14} />} label="Facebook"
          value={dbFields.facebook} onChange={(v: string) => updateDb("facebook", v)}
          placeholder="URL de tu página" />

        <InputRow icon={<Linkedin size={14} />} label="LinkedIn"
          value={dbFields.linkedin} onChange={(v: string) => updateDb("linkedin", v)}
          placeholder="URL de tu perfil" />

        <InputRow icon={<Globe size={14} />} label="Sitio web externo (opcional)"
          value={dbFields.website} onChange={(v: string) => updateDb("website", v)}
          placeholder="https://..." />
      </section>
    </div>
  );
}