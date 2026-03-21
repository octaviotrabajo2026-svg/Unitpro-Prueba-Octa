"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation"; 
import { 
  X, Star, MessageCircle, ArrowRight, Loader2, 
  Menu, Maximize2, ExternalLink, Github, Linkedin, Mail, CheckCircle, ArrowDown 
} from "lucide-react";

import { SafeHTML } from "@/components/ui/SafeHTML";
import { Footer } from "@/components/blocks/Footer";
import type { WebConfig } from "@/types/web-config";

interface ProjectItem {
  titulo: string; descripcion: string; imagenUrl: string; tags?: string[]; linkVerMas?: string;
}

export default function PortfolioLanding({ initialData }: { initialData: any }) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const isEditorMode = searchParams.get('editor') === 'true';

  const [negocio, setNegocio] = useState<any>(initialData);

  // --- MODALES ---
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- ESTADOS FORMULARIO ---
  const [nombreCliente, setNombreCliente] = useState(""); 
  const [mensajeCliente, setMensajeCliente] = useState("");
  const [emailCliente, setEmailCliente] = useState("");
  const [enviando, setEnviando] = useState(false);

  // --- LISTENER DEL EDITOR ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "UPDATE_CONFIG" && event.data?.payload) {
        setNegocio((prev: any) => ({ ...prev, config_web: event.data.payload }));
      }
      if (event.data?.type === "UPDATE_DB" && event.data?.payload) {
        setNegocio((prev: any) => ({ ...prev, ...event.data.payload }));
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // --- LÓGICA CONTACTO ---
  const handleContactar = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setEnviando(true);
    
    const { error } = await supabase.from("leads").insert([{ 
        negocio_id: negocio.id, 
        nombre_cliente: nombreCliente, 
        email_cliente: emailCliente,
        mensaje: mensajeCliente,
        estado: "nuevo",
        origen: "portfolio_contact"
    }]);

    setEnviando(false);

    if (!error) {
        const text = `Hola, vi tu portfolio y me interesa un proyecto. Soy ${nombreCliente}. ${mensajeCliente}`;
        // Abrir WhatsApp en pestaña nueva
        if (negocio.whatsapp) {
            window.open(`https://wa.me/${negocio.whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
        }
        
        setIsContactModalOpen(false);
        setNombreCliente(""); setEmailCliente(""); setMensajeCliente("");
        alert("¡Mensaje enviado correctamente!");
    } else {
        alert("Error al enviar. Por favor intenta contactarme directamente.");
    }
  };

  // --- UX HELPERS ---
  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  const handleEditClick = (e: React.MouseEvent, sectionName: string) => {
    if (!isEditorMode) return; 
    e.preventDefault(); e.stopPropagation();
    window.parent.postMessage({ type: "FOCUS_SECTION", section: sectionName }, "*");
  };
  
  const editableClass = isEditorMode ? "cursor-pointer hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 transition-all duration-200 rounded-lg relative z-50" : "";
  
  // --- CONFIGURACIÓN VISUAL ---
  const rawConfig = negocio?.config_web || {};
  const appearance = rawConfig.appearance || { font: 'sans', radius: 'medium' };
  
  const fontClass = { 'sans': 'font-sans', 'serif': 'font-serif', 'mono': 'font-mono' }[appearance.font as string] || 'font-sans';
  const radiusClass = { 'none': 'rounded-none', 'medium': 'rounded-2xl', 'full': 'rounded-[2.5rem]' }[appearance.radius as string] || 'rounded-2xl';
  const btnRadius = { 'none': 'rounded-none', 'medium': 'rounded-xl', 'full': 'rounded-full' }[appearance.radius as string] || 'rounded-xl';
  
  const config: WebConfig = {
    logoUrl: rawConfig.logoUrl || negocio.logo_url,
    template: rawConfig.template || "modern",
    colors: { primary: negocio?.color_principal || "#000000", ...rawConfig.colors },
    hero: { mostrar: true, layout: 'full', overlayOpacity: 50, ...rawConfig.hero },
    proyectos: { mostrar: true, titulo: "Proyectos Destacados", items: [], ...rawConfig.proyectos },
    testimonios: { mostrar: rawConfig.testimonios?.mostrar ?? false, titulo: "Testimonios", items: [] },
    footer: { mostrar: true, textoCopyright: rawConfig.footer?.textoCopyright, redesSociales: { ...rawConfig.footer?.redesSociales, whatsapp: negocio.whatsapp } },
    customSections: rawConfig.customSections || [],
    sectionOrder: rawConfig.sectionOrder
  };

  const brandColor = config.colors.primary;
  const secondaryColor = config.colors.secondary || "#ffffff";
  const textColor = config.colors.text || "#1f2937";
  const heroImage = config.hero.imagenUrl || negocio.imagen_url || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1920";

  return (
    <div className={`min-h-screen pb-0 overflow-x-hidden ${fontClass}`} style={{ backgroundColor: secondaryColor, color: textColor }}>
      
      {/* --- NAVBAR --- */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-zinc-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
            
            <div onClick={(e) => handleEditClick(e, 'identity')} className={`cursor-pointer ${editableClass}`}>
                {config.logoUrl ? (
                    <img src={config.logoUrl} alt="Logo" className="h-10 object-contain" />
                ) : (
                    <span className="text-xl font-bold tracking-tight text-zinc-900">{negocio.nombre}</span>
                )}
            </div>

            <div className="hidden md:flex items-center gap-8">
                <button onClick={() => scrollToSection('inicio')} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Inicio</button>
                {config.proyectos?.mostrar && (
                    <button onClick={() => scrollToSection('proyectos')} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Portafolio</button>
                )}
                {/* Botón CTA Navbar */}
                <button 
                    onClick={() => setIsContactModalOpen(true)} 
                    className={`px-6 py-2.5 text-white font-bold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all ${btnRadius}`} 
                    style={{ backgroundColor: brandColor }}
                >
                    Contactar
                </button>
            </div>

            <button className="md:hidden p-2 text-zinc-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X/> : <Menu/>}
            </button>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
             <div className="md:hidden bg-white border-t p-6 flex flex-col gap-4 shadow-xl">
                <button onClick={() => scrollToSection('inicio')} className="text-left font-medium p-2">Inicio</button>
                <button onClick={() => scrollToSection('proyectos')} className="text-left font-medium p-2">Portafolio</button>
                <button onClick={() => {setIsContactModalOpen(true); setMobileMenuOpen(false)}} className="w-full bg-zinc-900 text-white font-bold py-3 rounded-xl">Contactar</button>
            </div>
        )}
      </nav>

      {/* --- HERO SECTION (FULL SCREEN PROFESSIONAL) --- */}
      <header id="inicio" className="relative w-full h-screen min-h-[600px] flex items-center justify-center overflow-hidden" onClick={(e) => handleEditClick(e, 'hero')}>
         
         {/* Fondo Imagen Full */}
         <div className="absolute inset-0 w-full h-full z-0">
             <img src={heroImage} className="w-full h-full object-cover" alt="Hero Background"/>
             {/* Overlay oscuro configurable */}
             <div className="absolute inset-0 bg-black transition-all duration-300" style={{ opacity: (config.hero.overlayOpacity || 50) / 100 }}></div>
         </div>

         {/* Contenido Hero Glassmorphism */}
         <div className={`relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center gap-8 ${editableClass}`}>
            
            {/* Logo opcional en Hero para branding fuerte */}
            {/* <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 mb-4 shadow-2xl">
                <img src={config.logoUrl || "/file.svg"} className="w-10 h-10 invert opacity-90"/>
            </div> */}

            <div className="animate-in slide-in-from-bottom-8 fade-in duration-700">
                <SafeHTML as="h1" html={config.hero.titulo} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-tight drop-shadow-xl" />
                <SafeHTML as="p" html={config.hero.subtitulo} className="text-lg md:text-xl text-zinc-200 max-w-2xl mx-auto mb-10 leading-relaxed font-light" />
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button 
                        onClick={() => scrollToSection('proyectos')} 
                        className={`px-8 py-4 bg-white text-zinc-900 font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center gap-2 ${btnRadius}`}
                    >
                        Ver Proyectos <ArrowDown size={20}/>
                    </button>
                    <button 
                        onClick={() => setIsContactModalOpen(true)} 
                        className={`px-8 py-4 text-white border border-white/30 backdrop-blur-sm hover:bg-white/10 font-bold text-lg transition-all ${btnRadius}`}
                    >
                        {config.hero.ctaTexto || "Solicitar Presupuesto"}
                    </button>
                </div>
            </div>
         </div>
         
         {/* Scroll Indicator */}
         <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/50 animate-bounce cursor-pointer" onClick={() => scrollToSection('proyectos')}>
            <ArrowDown size={32} />
         </div>
      </header>

      {/* --- SECCIÓN PROYECTOS (GRID ELEGANTE) --- */}
      {config.proyectos?.mostrar && (
          <section id="proyectos" className="py-28 px-6 bg-zinc-50" onClick={(e) => handleEditClick(e, 'proyectos')}>
            <div className={`max-w-7xl mx-auto ${editableClass}`}>
                <div className="mb-20 text-center">
                    <span className="text-sm font-bold uppercase tracking-wider opacity-60 block mb-3" style={{ color: brandColor }}>Nuestra Experiencia</span>
                    <h2 className="text-4xl md:text-5xl font-bold" style={{ color: textColor }}>{config.proyectos.titulo}</h2>
                    <div className="w-24 h-1.5 mx-auto mt-6 rounded-full" style={{ backgroundColor: brandColor }}></div>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {config.proyectos?.items?.map((item: ProjectItem, i: number) => (
                        <div key={i} className={`group bg-white shadow-sm hover:shadow-2xl transition-all duration-500 flex flex-col overflow-hidden border border-zinc-100 ${radiusClass}`}>
                            {/* Imagen con Overlay al Hover */}
                            <div 
                                className="relative aspect-[4/3] overflow-hidden cursor-pointer"
                                onClick={() => setSelectedImage(item.imagenUrl)}
                            >
                                <img src={item.imagenUrl} alt={item.titulo} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                    <span className="text-white font-medium flex items-center gap-2 border border-white/50 px-4 py-2 rounded-full hover:bg-white hover:text-black transition-colors">
                                        <Maximize2 size={16}/> Ampliar
                                    </span>
                                </div>
                            </div>

                            {/* Contenido Card */}
                            <div className="p-8 flex flex-col flex-1">
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {item.tags?.map((tag, t) => (
                                        <span key={t} className="text-[10px] uppercase tracking-wider font-bold px-3 py-1 bg-zinc-100 text-zinc-500 rounded-full border border-zinc-200">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                                <h3 className="font-bold text-2xl mb-3 group-hover:text-indigo-600 transition-colors" style={{ color: textColor }}>{item.titulo}</h3>
                                <p className="text-zinc-500 text-sm leading-relaxed mb-8 flex-1 border-t border-dashed border-zinc-100 pt-4">{item.descripcion}</p>
                                
                                {item.linkVerMas && (
                                    <a 
                                        href={item.linkVerMas} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-bold hover:opacity-70 transition-opacity mt-auto"
                                        style={{ color: brandColor }}
                                    >
                                        Ver Caso de Estudio <ArrowRight size={16}/>
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </section>
      )}

      {/* --- SECCIONES CUSTOM --- */}
      {config.customSections?.map((section: any) => (
        <section key={section.id} className="py-24 px-6 max-w-7xl mx-auto border-t border-zinc-100">
            {section.type === 'about' && (
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <div className={section.imagenUrl ? 'order-1' : ''}>
                        <h2 className="text-3xl font-bold mb-6 text-zinc-900">{section.titulo}</h2>
                        <SafeHTML as="div" html={section.texto} className="text-lg text-zinc-600 leading-relaxed whitespace-pre-line" />
                        
                        {/* Firma o Call to Action secundario en About */}
                        <div className="mt-8 pt-8 border-t border-zinc-100">
                             <button onClick={() => setIsContactModalOpen(true)} className="text-sm font-bold underline" style={{ color: brandColor }}>Trabaja con nosotros</button>
                        </div>
                    </div>
                    {section.imagenUrl && (
                        <div className={`overflow-hidden shadow-2xl h-[500px] relative ${radiusClass}`}>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            <img src={section.imagenUrl} alt={section.titulo} className="w-full h-full object-cover"/>
                        </div>
                    )}
                </div>
            )}
             {/* Si es GALERÍA */}
             {section.type === 'gallery' && (
                <div>
                    <h2 className="text-3xl font-bold mb-12 text-center text-zinc-900">{section.titulo}</h2>
                    <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                        {section.imagenes?.map((img: any, i: number) => (
                            <div 
                                key={i} 
                                onClick={() => setSelectedImage(img.url)} 
                                className={`group relative break-inside-avoid overflow-hidden bg-zinc-100 cursor-zoom-in ${radiusClass}`} 
                            >
                                <img src={img.url} alt={img.descripcion} className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"/>
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
      ))}

      {/* --- FOOTER --- */}
      <Footer data={config.footer || { mostrar: true, textoCopyright: "", redesSociales: {} }} negocioNombre={negocio.nombre} />

      {/* --- LIGHTBOX IMAGEN --- */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedImage(null)}>
            <button className="absolute top-4 right-4 text-white/70 hover:text-white p-2 transition-colors"><X size={32}/></button>
            <img src={selectedImage} className="max-w-full max-h-[90vh] rounded shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}/>
        </div>
      )}

      {/* --- MODAL DE CONTACTO --- */}
      {isContactModalOpen && (
        <Modal onClose={() => setIsContactModalOpen(false)} radiusClass={radiusClass}>
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-zinc-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm border border-zinc-100">
                    <Mail size={28} style={{ color: brandColor }}/>
                </div>
                <h3 className="text-2xl font-bold text-zinc-900">Iniciemos una conversación</h3>
                <p className="text-zinc-500 text-sm mt-2 max-w-xs mx-auto">Cuéntanos sobre tu proyecto. Te responderemos en menos de 24hs.</p>
            </div>

            <form onSubmit={handleContactar} className="space-y-5">
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">Nombre</label>
                        <input required className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                            value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} placeholder="Tu nombre"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">Email</label>
                        <input required type="email" className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" 
                            value={emailCliente} onChange={e => setEmailCliente(e.target.value)} placeholder="tu@email.com"/>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1 mb-1 block">Detalles del Proyecto</label>
                    <textarea required rows={4} className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none" 
                        value={mensajeCliente} onChange={e => setMensajeCliente(e.target.value)} placeholder="Estoy buscando..."/>
                </div>

                <button type="submit" disabled={enviando} className={`w-full text-white font-bold py-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2 ${btnRadius}`} style={{ backgroundColor: brandColor }}>
                    {enviando ? <Loader2 className="animate-spin"/> : "Enviar Consulta"}
                </button>
                
                <p className="text-center text-xs text-zinc-400 mt-4">
                    Al enviar, aceptas ser contactado para recibir información sobre tu presupuesto.
                </p>
            </form>
        </Modal>
      )}

    </div>
  );
}

// Modal Helper
function Modal({ children, onClose, radiusClass }: any) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in">
          <div className={`bg-white shadow-2xl w-full max-w-lg p-8 relative animate-in zoom-in-95 ${radiusClass}`}>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-zinc-300 hover:text-zinc-600 transition-colors"><X size={20} /></button>
            {children}
          </div>
        </div>
    )
}