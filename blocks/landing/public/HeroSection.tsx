"use client";
// blocks/landing/public/HeroSection.tsx

import { useState, useEffect } from "react";
import { Menu, X, CalendarIcon } from "lucide-react";
import { SafeHTML } from "@/components/ui/SafeHTML";
import type { BlockSectionProps } from "@/types/blocks";
import { trackPageView } from "@/lib/tracking";

export default function HeroSection({ negocio, config: blockConfig }: BlockSectionProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Registra pageview al montar la landing (fire-and-forget)
  useEffect(() => {
    if (negocio?.id) trackPageView(negocio.id);
  }, [negocio?.id]);

  const raw = negocio?.config_web || {};
  const cfg = {
    logoUrl:    (blockConfig?.logoUrl   as string) ?? raw.logoUrl ?? negocio.logo_url,
    colors:     { primary: negocio?.color_principal || "#000000", ...raw.colors, ...(blockConfig?.colors as object) },
    hero:       { mostrar: true, ...raw.hero,      ...(blockConfig?.hero       as object) },
    servicios:  { mostrar: true, ...raw.servicios, ...(blockConfig?.servicios  as object) },
    ubicacion:  { mostrar: true, ...raw.ubicacion, ...(blockConfig?.ubicacion  as object) },
    appearance: { font: "sans", radius: "medium",  ...(blockConfig?.appearance as object) ?? raw.appearance },
  };

  const brandColor = cfg.colors.primary as string;
  const heroImage  = (cfg.hero as any).imagenUrl || negocio.imagen_url
    || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200";
  const overlayOp  = ((cfg.hero as any).overlayOpacity ?? 50) / 100;
  const btnRadius  = { none: "rounded-none", medium: "rounded-xl", full: "rounded-full" }[
    (cfg.appearance as any).radius as string
  ] ?? "rounded-xl";
  const subtitulo  = (cfg.hero as any).subtitulo as string | undefined;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMobileMenuOpen(false);
  };

  const openBookingModal = () => {
    window.dispatchEvent(new CustomEvent("unitpro:open-booking"));
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-zinc-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div>
            {cfg.logoUrl ? (
              <img src={cfg.logoUrl as string} alt="Logo" className="h-10 object-contain" />
            ) : (
              <span className="text-xl font-bold tracking-tight text-zinc-900">{negocio.nombre}</span>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-8">
            <button onClick={() => scrollTo("inicio")} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Inicio</button>
            {(cfg.servicios as any)?.mostrar && (
              <button onClick={() => scrollTo("servicios")} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Servicios</button>
            )}
            {(cfg.ubicacion as any)?.mostrar && (
              <button onClick={() => scrollTo("ubicacion")} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Dónde estamos</button>
            )}
            <button onClick={() => scrollTo("contacto")} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Contacto</button>
            <button
              onClick={openBookingModal}
              className={`px-5 py-2.5 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all ${btnRadius}`}
              style={{ backgroundColor: brandColor }}
            >
              Reservar Turno
            </button>
          </div>

          <button className="lg:hidden p-2 text-zinc-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-t border-zinc-100 p-6 flex flex-col gap-4 shadow-xl">
            <button onClick={() => scrollTo("inicio")} className="text-left font-medium text-zinc-600 py-2">Inicio</button>
            {(cfg.servicios as any)?.mostrar && (
              <button onClick={() => scrollTo("servicios")} className="text-left font-medium text-zinc-600 py-2">Servicios</button>
            )}
            {(cfg.ubicacion as any)?.mostrar && (
              <button onClick={() => scrollTo("ubicacion")} className="text-left font-medium text-zinc-600 py-2">Dónde estamos</button>
            )}
            <button onClick={() => scrollTo("contacto")} className="text-left font-medium text-zinc-600 py-2">Contacto</button>
            <button
              onClick={openBookingModal}
              className={`w-full text-white font-bold py-3 mt-2 ${btnRadius}`}
              style={{ backgroundColor: brandColor }}
            >
              Reservar Turno
            </button>
          </div>
        )}
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <header id="inicio" className="relative w-full min-h-[100svh] flex flex-col items-center justify-center overflow-hidden py-28">
        <div className="absolute inset-0 w-full h-full z-0">
          <img src={heroImage} className="w-full h-full object-cover" alt="Fondo" />
          <div className="absolute inset-0 bg-black transition-all duration-300" style={{ opacity: overlayOp }} />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center justify-center pt-8">
          {cfg.logoUrl && (
            <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center mb-14">
              <img src={cfg.logoUrl as string} alt="Logo" className="w-full h-full object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)]" />
            </div>
          )}

          <div className="bg-white/15 backdrop-blur-xl border border-white/20 p-6 md:p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-in zoom-in-95 fade-in duration-700 w-full max-w-xl">
            <SafeHTML
              as="h1"
              html={(cfg.hero as any).titulo || negocio.nombre}
              className="text-3xl lg:text-[3.5rem] font-extrabold tracking-tight text-white mb-4 drop-shadow-md leading-tight"
            />

            {/* Subtítulo / descripción — solo si tiene contenido */}
            {subtitulo && subtitulo.trim() !== "" && (
              <p className="text-white/80 text-base md:text-lg mb-5 leading-relaxed drop-shadow">
                {subtitulo}
              </p>
            )}

            <div className="flex flex-col lg:flex-row items-center justify-center gap-4">
              <button
                onClick={openBookingModal}
                className={`w-full sm:w-auto px-8 py-3.5 min-h-[48px] text-white font-bold text-base shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 ${btnRadius}`}
                style={{ backgroundColor: brandColor }}
              >
                <CalendarIcon size={20} /> {(cfg.hero as any).ctaTexto || "Reservar Turno"}
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}