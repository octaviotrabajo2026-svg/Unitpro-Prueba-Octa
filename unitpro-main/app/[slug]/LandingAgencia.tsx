"use client";
// app/[slug]/LandingAgencia.tsx
// Landing pública de una agencia. Lee de agencies.landing_config (JSONB).
// SQL: ALTER TABLE agencies ADD COLUMN IF NOT EXISTS landing_config JSONB DEFAULT '{}';

import { Building2, ArrowRight, LayoutDashboard, MessageCircle, Mail, Instagram, Facebook, Briefcase, Star, Zap, Globe } from "lucide-react";

export const DEFAULT_LANDING_CONFIG = {
  hero: {
    titulo:    "Transformamos negocios locales con soluciones digitales.",
    subtitulo: "Creamos páginas web y software a medida para que tu negocio escale y venda más.",
  },
  colors: {
    primary: "#577a2c",
    bg:      "#f8faf4",
  },
  services: [
    { id: "1", titulo: "Páginas Web",     descripcion: "Sitios modernos, rápidos y optimizados para convertir visitas en clientes.",        icono: "Globe"    },
    { id: "2", titulo: "Turnos Online",   descripcion: "Sistema de reservas automáticas para que tus clientes agenden sin llamarte.",        icono: "Star"     },
    { id: "3", titulo: "Gestión Digital", descripcion: "Panel completo: clientes, reseñas, pagos y más en un solo lugar.",                   icono: "Zap"      },
  ],
  contact: { whatsapp: "", email: "", instagram: "", facebook: "" },
};

const ICONOS: Record<string, React.ReactNode> = {
  Globe: <Globe size={24} />, Star: <Star size={24} />, Zap: <Zap size={24} />, Briefcase: <Briefcase size={24} />,
};

export default function LandingAgencia({ initialData }: { initialData: any }) {
  const agency = initialData;
  const raw    = agency.landing_config || {};
  const cfg    = {
    hero:     { ...DEFAULT_LANDING_CONFIG.hero,    ...(raw.hero    || {}) },
    colors:   { ...DEFAULT_LANDING_CONFIG.colors,  ...(raw.colors  || {}) },
    services: (raw.services?.length > 0) ? raw.services : DEFAULT_LANDING_CONFIG.services,
    contact:  { ...DEFAULT_LANDING_CONFIG.contact, ...(raw.contact || {}) },
  };

  const primary    = cfg.colors.primary || "#577a2c";
  const bg         = cfg.colors.bg      || "#f8faf4";
  const agencyName = agency.nombre_agencia || agency.name || "Agencia Digital";
  const hasContact = cfg.contact.whatsapp || cfg.contact.email || cfg.contact.instagram || cfg.contact.facebook;

  return (
    <div className="min-h-screen font-sans text-slate-900" style={{ backgroundColor: bg }}>

      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {agency.logo_url
              ? <img src={agency.logo_url} className="h-10 w-auto object-contain" alt="Logo" />
              : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: primary }}><Building2 size={20} /></div>
            }
            <span className="font-bold text-xl tracking-tight">{agencyName}</span>
          </div>
          <div className="flex items-center gap-3">
            <a href={`/${agency.slug}/dashboard`} className="hidden md:flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors">
              <LayoutDashboard size={15} /> Dashboard
            </a>
            {hasContact && (
              <a href="#contacto" className="text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all hover:opacity-90 hover:scale-105" style={{ backgroundColor: primary }}>
                Contactar
              </a>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="py-28 px-6 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold mb-8 border"
          style={{ backgroundColor: `${primary}15`, color: primary, borderColor: `${primary}30` }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: primary }}></span>
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: primary }}></span>
          </span>
          Agencia Certificada UnitPro
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight text-slate-900 leading-[1.1]">{cfg.hero.titulo}</h1>
        <p className="text-lg md:text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed">{cfg.hero.subtitulo}</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          {cfg.contact.whatsapp
            ? <a href={`https://wa.me/${cfg.contact.whatsapp.replace(/\D/g,"")}`} target="_blank"
                className="text-white px-8 py-4 rounded-xl font-bold text-base shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: primary }}>
                <MessageCircle size={18} /> Hablar por WhatsApp
              </a>
            : <a href="#servicios" className="text-white px-8 py-4 rounded-xl font-bold text-base shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: primary }}>
                Ver Servicios <ArrowRight size={18} />
              </a>
          }
          <a href="#servicios" className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-xl font-bold text-base hover:bg-slate-50 transition-all flex items-center justify-center">
            Nuestros Servicios
          </a>
        </div>
      </section>

      {/* SERVICIOS */}
      {cfg.services.length > 0 && (
        <section id="servicios" className="py-20 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-extrabold text-center mb-3">Lo que ofrecemos</h2>
            <p className="text-slate-500 text-center mb-12 max-w-xl mx-auto">Soluciones digitales diseñadas para negocios locales que quieren crecer.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {cfg.services.map((s: any) => (
                <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:-translate-y-1 transition-all">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 shadow-md" style={{ backgroundColor: primary }}>
                    {ICONOS[s.icono] || <Briefcase size={24} />}
                  </div>
                  <h3 className="font-bold text-lg mb-2">{s.titulo}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.descripcion}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CONTACTO */}
      {hasContact && (
        <section id="contacto" className="py-20 px-6">
          <div className="max-w-lg mx-auto text-center">
            <h2 className="text-3xl font-extrabold mb-3">Hablemos</h2>
            <p className="text-slate-500 mb-10">Contanos tu proyecto y te respondemos rápido.</p>
            <div className="flex flex-col gap-3">
              {cfg.contact.whatsapp && (
                <a href={`https://wa.me/${cfg.contact.whatsapp.replace(/\D/g,"")}`} target="_blank"
                  className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-white font-bold hover:opacity-90 transition-all" style={{ backgroundColor: primary }}>
                  <MessageCircle size={18} /> {cfg.contact.whatsapp}
                </a>
              )}
              {cfg.contact.email && (
                <a href={`mailto:${cfg.contact.email}`} className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-all">
                  <Mail size={18} /> {cfg.contact.email}
                </a>
              )}
              <div className="flex gap-3 justify-center mt-2">
                {cfg.contact.instagram && (
                  <a href={`https://instagram.com/${cfg.contact.instagram.replace("@","")}`} target="_blank"
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all">
                    <Instagram size={16} /> Instagram
                  </a>
                )}
                {cfg.contact.facebook && (
                  <a href={cfg.contact.facebook.startsWith("http") ? cfg.contact.facebook : `https://facebook.com/${cfg.contact.facebook}`} target="_blank"
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all">
                    <Facebook size={16} /> Facebook
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-10 text-center text-slate-400 text-sm border-t border-slate-200 mt-10 bg-white">
        <p>© {new Date().getFullYear()} {agencyName}. Todos los derechos reservados.</p>
        <p className="mt-1 text-xs opacity-60">Creado con UnitPro</p>
      </footer>
    </div>
  );
}