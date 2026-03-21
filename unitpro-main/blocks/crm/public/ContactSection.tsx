"use client";
// blocks/crm/public/ContactSection.tsx
// Sección de ubicación, horarios, contacto y footer.

import { MapPin, Clock, Phone, Globe, Instagram, Facebook, Linkedin, ArrowRight } from "lucide-react";
import { Footer } from "@/components/blocks/Footer";
import type { BlockSectionProps } from "@/types/blocks";

export default function ContactSection({ negocio, config: blockConfig }: BlockSectionProps) {
  const raw = negocio?.config_web || {};

  // ── Config merge ──────────────────────────────────────────────────────────
  const cfg = {
    colors:   { primary: negocio?.color_principal || "#000000", ...raw.colors },
    ubicacion:{ mostrar: true, ...raw.ubicacion, ...(blockConfig?.ubicacion as object) },
    footer:   {
      mostrar: true,
      textoCopyright: raw.footer?.textoCopyright,
      redesSociales: {
        instagram: negocio.instagram,
        facebook:  negocio.facebook,
        linkedin:  negocio.linkedin,
        whatsapp:  negocio.whatsapp,
      },
      ...raw.footer,
    },
    appearance: { radius: "medium", ...(raw.appearance || {}) },
  };

  const brandColor = cfg.colors.primary as string;
  const textColor  = (raw.colors?.text as string) || "#1f2937";
  const radiusClass = { none: "rounded-none", medium: "rounded-2xl", full: "rounded-[2.5rem]" }[(cfg.appearance as any).radius as string] ?? "rounded-2xl";
  const schedule   = raw.schedule || {};

  // Agrupar horarios
  const dayNames: Record<string, string> = {
    "1": "Lunes", "2": "Martes", "3": "Miércoles", "4": "Jueves",
    "5": "Viernes", "6": "Sábado", "0": "Domingo",
  };
  const order = ["1", "2", "3", "4", "5", "6", "0"];
  const groups: { scheduleStr: string; days: string[]; isOpen: boolean }[] = [];

  order.forEach(k => {
    const d = schedule[k];
    const name = dayNames[k];
    let str = "Cerrado"; let isOpen = false;
    if (d?.isOpen) {
      isOpen = true;
      str = d.ranges?.length
        ? d.ranges.map((r: any) => `de ${r.start} a ${r.end}`).join(" y ")
        : `de ${(d as any).start || "09:00"} a ${(d as any).end || "18:00"}`;
    }
    const g = groups.find(x => x.scheduleStr === str);
    if (g) g.days.push(name); else groups.push({ scheduleStr: str, days: [name], isOpen });
  });

  return (
    <>
      {(cfg.ubicacion as any)?.mostrar && (
        <section id="ubicacion" className="py-24 px-6 relative overflow-hidden">
          <div className={`max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center`}>
            <div>
              <span className="text-sm font-bold uppercase tracking-wider opacity-60">Dónde estamos</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6" style={{ color: textColor }}>
                Visítanos en nuestra sucursal
              </h2>
              <p className="mb-8 text-lg opacity-70">
                Estamos listos para atenderte con la mejor calidad y servicio.
              </p>

              <div className="space-y-6">
                {/* Dirección */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: brandColor + "20", color: brandColor }}>
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold" style={{ color: textColor }}>Dirección</h4>
                    <p className="opacity-70">{negocio.direccion || "Dirección no configurada"}</p>
                    {negocio.google_maps_link && (
                      <a href={negocio.google_maps_link} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-bold mt-1 inline-flex items-center gap-1 hover:underline" style={{ color: brandColor }}>
                        Ver en Google Maps <ArrowRight size={14} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Horarios */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: brandColor + "20", color: brandColor }}>
                    <Clock size={20} />
                  </div>
                  <div className="w-full max-w-sm">
                    <h4 className="font-bold mb-3" style={{ color: textColor }}>Horarios de Atención</h4>
                    <div className="space-y-2 text-sm">
                      {groups.map((g, i) => {
                        let label = g.days.join(" / ");
                        if (g.days.length === 5 && g.days[0] === "Lunes" && g.days[4] === "Viernes") label = "Lunes a Viernes";
                        else if (g.days.length === 7) label = "Todos los días";
                        else if (g.days.length === 2 && g.days[0] === "Sábado" && g.days[1] === "Domingo") label = "Fines de semana";
                        return (
                          <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 pb-2 border-b border-zinc-500/10 last:border-0 last:pb-0">
                            <span className="font-medium min-w-[120px]" style={{ color: textColor }}>{label}</span>
                            {g.isOpen
                              ? <span className="text-[13px] opacity-80">{g.scheduleStr}</span>
                              : <span className="text-[13px] text-red-500 italic">Cerrado</span>
                            }
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* WhatsApp */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: brandColor + "20", color: brandColor }}>
                    <Phone size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold" style={{ color: textColor }}>Contacto Directo</h4>
                    {negocio.whatsapp ? (
                      <a href={`https://wa.me/${negocio.whatsapp.replace(/[^0-9]/g, "")}`}
                        target="_blank" rel="noopener noreferrer"
                        className="opacity-70 hover:underline hover:text-green-600 transition-colors">
                        {negocio.whatsapp}
                      </a>
                    ) : (
                      <p className="opacity-70">No especificado</p>
                    )}
                  </div>
                </div>

                {/* Redes sociales */}
                {(negocio.instagram || negocio.facebook || negocio.linkedin) && (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: brandColor + "20", color: brandColor }}>
                      <Globe size={20} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold" style={{ color: textColor }}>Redes Sociales</h4>
                      {negocio.instagram && (
                        <a href={negocio.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium hover:text-pink-400 transition-colors">
                          <Instagram size={18} /> Instagram
                        </a>
                      )}
                      {negocio.facebook && (
                        <a href={negocio.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium hover:text-blue-400 transition-colors">
                          <Facebook size={18} /> Facebook
                        </a>
                      )}
                      {negocio.linkedin && (
                        <a href={negocio.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-medium hover:text-sky-400 transition-colors">
                          <Linkedin size={18} /> LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mapa */}
            <div className={`h-[400px] bg-zinc-100 overflow-hidden shadow-2xl relative ${radiusClass}`}>
              {negocio.direccion ? (
                <iframe
                  width="100%" height="100%"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(negocio.direccion)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  title="Mapa" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-400 bg-zinc-200">
                  <div className="text-center p-6"><MapPin size={48} className="mx-auto mb-2 opacity-50" />Dirección no configurada</div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <div id="contacto">
        {cfg.footer?.mostrar && <Footer data={cfg.footer} negocioNombre={negocio.nombre} />}
      </div>
    </>
  );
}