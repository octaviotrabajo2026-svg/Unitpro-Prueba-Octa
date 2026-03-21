"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { 
  Save, X, LayoutTemplate, Eye, EyeOff, Loader2, Monitor, Smartphone, 
  ExternalLink, Palette, MousePointerClick, Layout, Layers, MapPin, 
  PlusCircle, Trash2, Image, FileText, ArrowUp, ArrowDown, 
  Briefcase, Tag, Globe, MessageSquare 
} from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Facebook, Instagram, Linkedin, Phone } from "lucide-react";

// Configuración por defecto específica para Portfolio/Proyectos
const DEFAULT_CONFIG = {
  template: "modern",
  appearance: { font: 'sans', radius: 'medium' },
  colors: { 
      primary: "#000000",  
      secondary: "#ffffff", 
      text: "#1f2937" 
  },
  hero: { 
    titulo: "Construimos el futuro", 
    subtitulo: "Expertos en arquitectura, diseño y ejecución de proyectos de alto nivel.", 
    ctaTexto: "Ver Proyectos", 
    mostrar: true,
    layout: "full", // Por defecto full screen para impacto visual
    overlayOpacity: 50
  },
  proyectos: { 
    mostrar: true, 
    titulo: "Proyectos Destacados", 
    items: [
      { 
        titulo: "Proyecto Alpha", 
        descripcion: "Reforma integral de oficinas corporativas.", 
        imagenUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c",
        tags: ["Oficinas", "Interiorismo"],
        linkVerMas: ""
      }
    ]
  },
  ubicacion: { mostrar: false }, // Menos relevante en portfolio digital, pero disponible
  testimonios: { mostrar: true, titulo: "Lo que dicen nuestros clientes", items: [] },
  footer: { mostrar: true, textoCopyright: "Todos los derechos reservados." }
};

export default function ProjectEditor({ negocio, onClose, onSave }: any) {
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // REFERENCIAS PARA SCROLL
  const sectionsRefs: any = {
    contact: useRef<HTMLDivElement>(null),
    appearance: useRef<HTMLDivElement>(null),
    identity: useRef<HTMLDivElement>(null),
    hero: useRef<HTMLDivElement>(null),
    proyectos: useRef<HTMLDivElement>(null),
    custom: useRef<HTMLDivElement>(null),
  };

  // ESTADO DE LA CONFIGURACIÓN
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG, ...(negocio.config_web || {}) });
  
  // DATOS DE CONTACTO (Base de datos)
  const [dbFields, setDbFields] = useState({
    direccion: negocio.direccion || "",
    whatsapp: negocio.whatsapp || "",
    instagram: negocio.instagram || "",
    facebook: negocio.facebook || "",
    linkedin: negocio.linkedin || "",
    google_maps_link: negocio.google_maps_link || ""
  });

  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);

  // --- COMUNICACIÓN CON IFRAME ---
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "FOCUS_SECTION") {
            const sectionName = event.data.section;
            const targetRef = sectionsRefs[sectionName] || document.getElementById(`section-editor-${sectionName}`);
            if (targetRef) {
                targetRef.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setActiveSection(sectionName);
                setTimeout(() => setActiveSection(null), 2000); 
            }
        }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const sendConfigUpdate = (newConfig: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "UPDATE_CONFIG", payload: newConfig }, "*");
    }
  };

  const sendDbUpdate = (newDbFields: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: "UPDATE_DB", payload: newDbFields }, "*");
    }
  };

  // --- GUARDADO ---
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("negocios").update({ 
        config_web: config,
        ...dbFields
    }).eq("id", negocio.id);

    if (error) alert("Error: " + error.message);
    setSaving(false);
    if (onSave) onSave();
  };

  // --- HELPERS DE ACTUALIZACIÓN ---
  const updateConfigField = (section: string, field: string, value: any) => {
    setConfig((prev: any) => {
      let newConfig;
      if (section === 'root') newConfig = { ...prev, [field]: value };
      else newConfig = { ...prev, [section]: { ...prev[section], [field]: value } };
      sendConfigUpdate(newConfig);
      return newConfig;
    });
  };

  const updateArrayItem = (section: string, index: number, field: string, value: any) => {
    setConfig((prev: any) => {
        const currentItems = prev[section]?.items || [];
        const newItems = [...currentItems];
        if (!newItems[index]) newItems[index] = {}; 
        newItems[index] = { ...newItems[index], [field]: value };
        const newConfig = { ...prev, [section]: { ...prev[section], items: newItems } };
        sendConfigUpdate(newConfig);
        return newConfig;
    });
  };

  const updateDbField = (field: string, value: string) => {
      const newDb = { ...dbFields, [field]: value };
      setDbFields(newDb);
      sendDbUpdate(newDb);
  };

  // --- GESTIÓN DE SECCIONES DINÁMICAS ---
  const addSection = (type: 'about' | 'gallery') => {
    const newId = Math.random().toString(36).substr(2, 9);
    let newSection: any = { id: newId, type };

    if (type === 'about') {
        newSection = { ...newSection, titulo: "Nuestra Historia", texto: "Contamos con más de 10 años de experiencia...", imagenUrl: "" };
    } else if (type === 'gallery') {
        newSection = { ...newSection, titulo: "Galería de Fotos", imagenes: [] };
    }

    setConfig((prev: any) => {
        const currentSections = prev.customSections || [];
        const currentOrder = prev.sectionOrder || [];
        const newConfig = { ...prev, customSections: [...currentSections, newSection], sectionOrder: [...currentOrder, newId] };
        sendConfigUpdate(newConfig);
        return newConfig;
    });
    setIsAddMenuOpen(false);
    setTimeout(() => {
        const el = document.getElementById(`section-editor-${newId}`);
        if(el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const removeSection = (id: string) => {
    if(!window.confirm("¿Borrar esta sección?")) return;
    setConfig((prev: any) => {
        const newSections = prev.customSections.filter((s: any) => s.id !== id);
        const newOrder = (prev.sectionOrder || []).filter((item: string) => item !== id);
        const newConfig = { ...prev, customSections: newSections, sectionOrder: newOrder };
        sendConfigUpdate(newConfig);
        return newConfig;
    });
  };

  const updateCustomSection = (id: string, field: string, value: any) => {
    setConfig((prev: any) => {
        const newSections = prev.customSections.map((s: any) => s.id === id ? { ...s, [field]: value } : s);
        const newConfig = { ...prev, customSections: newSections };
        sendConfigUpdate(newConfig);
        return newConfig;
    });
  };

  // ORDENAMIENTO
  useEffect(() => {
    if (!config.sectionOrder || config.sectionOrder.length === 0) {
        const customIds = config.customSections?.map((s:any) => s.id) || [];
        const defaultOrder = ['hero', 'proyectos', 'testimonios', ...customIds, 'ubicacion']; // 'proyectos' es clave aquí
        updateConfigField('root', 'sectionOrder', defaultOrder);
    }
  }, [config.customSections]);

  const moveSection = (index: number, direction: -1 | 1) => {
      const currentOrder = config.sectionOrder || [];
      const newOrder = [...currentOrder];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= newOrder.length) return;
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      updateConfigField('root', 'sectionOrder', newOrder);
  };

  const previewUrl = `/${negocio.slug}?editor=true`; 
  const getSectionClass = (name: string) => `space-y-4 bg-white p-5 rounded-xl border transition-all duration-500 ${activeSection === name ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-indigo-500' : 'border-zinc-200 shadow-sm'}`;

  // HEADER COMÚN CON FLECHAS
  const SectionHeader = ({ title, icon, toggleField, toggleSection, index }: any) => (
    <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
        <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2">
            {icon} {title}
        </h3>
        <div className="flex items-center gap-1">
            <button onClick={() => moveSection(index, -1)} disabled={index === 0} className="p-1 text-zinc-400 hover:text-zinc-800 disabled:opacity-30"><ArrowUp size={14}/></button>
            <button onClick={() => moveSection(index, 1)} disabled={index === ((config.sectionOrder?.length || 0) - 1)} className="p-1 text-zinc-400 hover:text-zinc-800 disabled:opacity-30"><ArrowDown size={14}/></button>
            {toggleField && (
                <button onClick={() => updateConfigField(toggleSection, toggleField, !config[toggleSection]?.[toggleField])} className="ml-2 text-zinc-400 hover:text-indigo-600">
                    {config[toggleSection]?.[toggleField] ? <Eye size={16}/> : <EyeOff size={16}/>}
                </button>
            )}
        </div>
    </div>
  );

  return (
    <div className="w-full h-full flex bg-zinc-100 font-sans overflow-hidden">
      
      {/* --- PREVIEW AREA (IZQUIERDA) --- */}
      <div className="flex-1 flex flex-col h-full relative border-r border-zinc-300">
        <div className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 shadow-sm z-10">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-100 font-bold">
                    <MousePointerClick size={14}/> Click-to-Edit Activo
                </div>
            </div>
            <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                <button onClick={() => setViewMode("desktop")} className={`p-2 rounded-md ${viewMode === "desktop" ? "bg-white shadow text-indigo-600" : "text-zinc-400"}`}><Monitor size={18} /></button>
                <button onClick={() => setViewMode("mobile")} className={`p-2 rounded-md ${viewMode === "mobile" ? "bg-white shadow text-indigo-600" : "text-zinc-400"}`}><Smartphone size={18} /></button>
            </div>
        </div>
        <div className="flex-1 bg-zinc-200/50 flex items-center justify-center p-8 overflow-hidden relative">
            <div className={`transition-all duration-500 bg-white shadow-2xl border border-zinc-300 overflow-hidden ${viewMode === "mobile" ? "w-[375px] h-[667px] rounded-[2.5rem] border-[8px] border-zinc-800 shadow-xl" : "w-full h-full rounded-lg shadow-lg"}`}>
                <iframe 
                    ref={iframeRef} 
                    src={previewUrl} 
                    className="w-full h-full bg-white" 
                    style={{ border: 'none' }} 
                    title="Preview" 
                    onLoad={() => { sendConfigUpdate(config); sendDbUpdate(dbFields); }} 
                />
            </div>
        </div>
      </div>

      {/* --- SIDEBAR EDITOR (DERECHA) --- */}
      <div className="w-[400px] bg-white shadow-2xl flex flex-col h-full z-20 border-l border-zinc-200">
        
        {/* HEADER SIDEBAR */}
        <div className="p-5 border-b border-zinc-200 flex justify-between items-center bg-white sticky top-0 z-10">
            <h2 className="font-bold text-lg text-zinc-900 flex items-center gap-2"><LayoutTemplate size={20} className="text-indigo-600"/> Editor Portfolio</h2>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-zinc-50/30">
            
            {/* GESTOR DE SECCIONES (Añadir/Quitar) */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Layers size={14} className="text-zinc-400"/> Estructura Web
                </h3>
                <div className="space-y-2">
                    {/* Toggle Proyectos */}
                    <div className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg transition-colors">
                        <span className="text-sm font-medium text-zinc-600">Portafolio</span>
                        <button onClick={() => updateConfigField('proyectos', 'mostrar', !config.proyectos?.mostrar)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.proyectos?.mostrar ? 'bg-indigo-600' : 'bg-zinc-200'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.proyectos?.mostrar ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>
                    {/* Toggle Testimonios */}
                    <div className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg transition-colors">
                        <span className="text-sm font-medium text-zinc-600">Testimonios</span>
                        <button onClick={() => updateConfigField('testimonios', 'mostrar', !config.testimonios?.mostrar)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.testimonios?.mostrar ? 'bg-indigo-600' : 'bg-zinc-200'}`}>
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.testimonios?.mostrar ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>

                     {/* BOTÓN AGREGAR SECCIÓN */}
                     <div className="pt-4 border-t border-zinc-100 relative">
                        <button 
                            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                            className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 font-bold text-sm hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                        >
                            <PlusCircle size={18}/> Agregar Bloque
                        </button>
                        {isAddMenuOpen && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-white border border-zinc-200 shadow-xl rounded-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                                <button onClick={() => addSection('about')} className="w-full text-left px-4 py-3 hover:bg-zinc-50 flex items-center gap-3 text-sm font-medium text-zinc-700">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FileText size={16}/></div>
                                    Quiénes Somos
                                </button>
                                <button onClick={() => addSection('gallery')} className="w-full text-left px-4 py-3 hover:bg-zinc-50 flex items-center gap-3 text-sm font-medium text-zinc-700 border-t border-zinc-100">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Image size={16}/></div>
                                    Galería Simple
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 1. SECCIÓN APARIENCIA & COLORES */}
            <div ref={sectionsRefs.appearance} className={getSectionClass('appearance')}>
                <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-100">
                    <Palette size={16} className="text-purple-500" /> Branding
                </h3>
                {/* Logo */}
                <ImageUpload label="Logo del Negocio" value={config.logoUrl} onChange={(url) => updateConfigField('root', 'logoUrl', url)} />
                
                <div className="mt-4 grid grid-cols-2 gap-3">
                     <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Color Principal</label>
                        <div className="flex items-center gap-2 p-2 border rounded-lg bg-zinc-50">
                            <input type="color" value={config.colors?.primary || "#000000"} onChange={(e) => updateConfigField('colors', 'primary', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"/>
                            <span className="text-xs font-mono">{config.colors?.primary}</span>
                        </div>
                     </div>
                     <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Fondo / Secundario</label>
                        <div className="flex items-center gap-2 p-2 border rounded-lg bg-zinc-50">
                            <input type="color" value={config.colors?.secondary || "#ffffff"} onChange={(e) => updateConfigField('colors', 'secondary', e.target.value)} className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"/>
                            <span className="text-xs font-mono">{config.colors?.secondary}</span>
                        </div>
                     </div>
                </div>
            </div>

            {/* 2. SECCIÓN CONTACTO (DB) */}
            <div ref={sectionsRefs.contact} className={getSectionClass('contact')}>
                <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-100">
                    <MapPin size={16} className="text-blue-500" /> Datos de Contacto
                </h3>
                <div className="space-y-3">
                    <input type="text" placeholder="WhatsApp (Ej: 549...)" value={dbFields.whatsapp} onChange={(e) => updateDbField('whatsapp', e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white"/>
                    <input type="text" placeholder="Link Instagram" value={dbFields.instagram} onChange={(e) => updateDbField('instagram', e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white"/>
                    <input type="text" placeholder="Link LinkedIn" value={dbFields.linkedin} onChange={(e) => updateDbField('linkedin', e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white"/>
                    <input type="text" placeholder="Dirección Física (Opcional)" value={dbFields.direccion} onChange={(e) => updateDbField('direccion', e.target.value)} className="w-full p-2 border rounded-lg text-sm bg-white"/>
                </div>
            </div>

            {/* 3. HERO (PORTADA) */}
            <div ref={sectionsRefs.hero} className={getSectionClass('hero')}>
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                    <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Portada (Hero)</h3>
                    <button onClick={() => updateConfigField('hero', 'mostrar', !config.hero?.mostrar)} className="text-zinc-400 hover:text-indigo-600"><Eye size={16}/></button>
                </div>
                {config.hero?.mostrar && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        {/* Control Layout */}
                        <div className="flex gap-2 mb-2">
                             <button onClick={() => updateConfigField('hero', 'layout', 'full')} className={`flex-1 py-2 text-xs border rounded-lg ${config.hero?.layout === 'full' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : ''}`}>Full Screen</button>
                             <button onClick={() => updateConfigField('hero', 'layout', 'split')} className={`flex-1 py-2 text-xs border rounded-lg ${config.hero?.layout === 'split' ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold' : ''}`}>Dividido</button>
                        </div>
                        {/* Opacidad Overlay */}
                        <div>
                            <label className="text-[10px] font-bold text-zinc-400 uppercase flex justify-between">Opacidad Filtro Oscuro <span>{config.hero?.overlayOpacity}%</span></label>
                            <input type="range" min="0" max="90" value={config.hero?.overlayOpacity || 50} onChange={(e) => updateConfigField('hero', 'overlayOpacity', e.target.value)} className="w-full accent-indigo-600"/>
                        </div>
                        <input type="text" value={config.hero.titulo} onChange={(e) => updateConfigField('hero', 'titulo', e.target.value)} className="w-full p-2 border rounded text-sm font-bold" placeholder="Título Principal"/>
                        <textarea rows={3} value={config.hero.subtitulo} onChange={(e) => updateConfigField('hero', 'subtitulo', e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Subtítulo impactante"/>
                        <input type="text" value={config.hero.ctaTexto} onChange={(e) => updateConfigField('hero', 'ctaTexto', e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Texto Botón (Ej: Ver Proyectos)"/>
                        <ImageUpload label="Imagen de Fondo" value={config.hero.imagenUrl} onChange={(url) => updateConfigField('hero', 'imagenUrl', url)} />
                    </div>
                )}
            </div>

            {/* --- ORDENAMIENTO DE SECCIONES --- */}
            <div className="space-y-8 mt-8">
                <div className="px-1 text-xs font-bold text-zinc-400 uppercase tracking-wider">Contenido del Sitio</div>
                
                {(config.sectionOrder || []).map((sectionId: string, index: number) => {
                    
                    /* === EDITOR DE PROYECTOS === */
                    if (sectionId === 'proyectos') return (
                        <div key="proyectos" ref={sectionsRefs.proyectos} className={getSectionClass('proyectos')}>
                            <SectionHeader title="Mis Proyectos" icon={<Briefcase size={14} className="text-orange-500"/>} toggleSection="proyectos" toggleField="mostrar" index={index}/>
                            
                            {config.proyectos?.mostrar && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <input 
                                        type="text" 
                                        value={config.proyectos.titulo} 
                                        onChange={(e) => updateConfigField('proyectos', 'titulo', e.target.value)} 
                                        className="w-full p-2 border rounded-lg text-sm font-bold bg-zinc-50"
                                        placeholder="Título (Ej: Proyectos Destacados)"
                                    />

                                    {/* LISTA PROYECTOS */}
                                    <div className="space-y-4">
                                        {config.proyectos.items?.map((item: any, i: number) => (
                                            <div key={i} className="p-4 border border-zinc-200 rounded-xl bg-white relative group shadow-sm hover:shadow-md transition-all">
                                                <button onClick={() => { const newItems = config.proyectos.items.filter((_:any, idx:number) => idx !== i); updateConfigField('proyectos', 'items', newItems); }} className="absolute top-2 right-2 p-1 text-zinc-300 hover:text-red-500 transition-colors"><X size={16}/></button>
                                                
                                                <div className="flex flex-col gap-3">
                                                    {/* Imagen Proyecto */}
                                                    <ImageUpload label="" value={item.imagenUrl} onChange={(url) => updateArrayItem('proyectos', i, 'imagenUrl', url)} />
                                                    
                                                    {/* Datos Texto */}
                                                    <input value={item.titulo} onChange={(e) => updateArrayItem('proyectos', i, 'titulo', e.target.value)} className="w-full p-2 border rounded-lg text-sm font-bold" placeholder="Nombre del Proyecto"/>
                                                    <textarea value={item.descripcion} onChange={(e) => updateArrayItem('proyectos', i, 'descripcion', e.target.value)} className="w-full p-2 border rounded-lg text-sm text-zinc-600" rows={2} placeholder="Breve descripción..."/>
                                                    
                                                    {/* Tags y Link */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="relative">
                                                            <Tag size={12} className="absolute left-2 top-3 text-zinc-400"/>
                                                            <input 
                                                                value={item.tags?.join(", ") || ""} 
                                                                onChange={(e) => updateArrayItem('proyectos', i, 'tags', e.target.value.split(",").map(t => t.trim()))} 
                                                                className="w-full p-2 pl-7 border rounded-lg text-xs" 
                                                                placeholder="Tags (sep. comas)"
                                                            />
                                                        </div>
                                                        <div className="relative">
                                                            <Globe size={12} className="absolute left-2 top-3 text-zinc-400"/>
                                                            <input 
                                                                value={item.linkVerMas || ""} 
                                                                onChange={(e) => updateArrayItem('proyectos', i, 'linkVerMas', e.target.value)} 
                                                                className="w-full p-2 pl-7 border rounded-lg text-xs" 
                                                                placeholder="Link Externo (Opcional)"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Botón Agregar */}
                                    <button 
                                        onClick={() => {
                                            const newItem = { titulo: "Nuevo Proyecto", descripcion: "", imagenUrl: "", tags: ["Nuevo"], linkVerMas: "" };
                                            const newItems = [...(config.proyectos.items || []), newItem];
                                            updateConfigField('proyectos', 'items', newItems);
                                        }}
                                        className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 font-bold text-sm hover:border-orange-500 hover:text-orange-600 hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <PlusCircle size={18}/> Agregar Proyecto
                                    </button>
                                </div>
                            )}
                        </div>
                    );

                    /* === EDITOR TESTIMONIOS === */
                    if (sectionId === 'testimonios') return (
                        <div key="testimonios" className={getSectionClass('testimonios')}>
                            <SectionHeader title="Testimonios" icon={<MessageSquare size={14} className="text-yellow-500"/>} toggleSection="testimonios" toggleField="mostrar" index={index}/>
                            {config.testimonios?.mostrar && (
                                <div className="space-y-2">
                                    <input type="text" value={config.testimonios?.titulo} onChange={(e) => updateConfigField('testimonios', 'titulo', e.target.value)} className="w-full p-2 border rounded text-sm" placeholder="Título Sección"/>
                                    <p className="text-xs text-zinc-400 bg-zinc-50 p-2 rounded">Las reseñas se gestionan automáticamente cuando los clientes dejan feedback.</p>
                                </div>
                            )}
                        </div>
                    );

                    /* === EDITOR SECCIONES PERSONALIZADAS === */
                    const customSection = config.customSections?.find((s:any) => s.id === sectionId);
                    if (customSection) {
                        return (
                            <div key={sectionId} id={`section-editor-${sectionId}`} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4 relative group">
                                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                                    <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2">
                                        {customSection.type === 'about' ? <FileText size={16} className="text-blue-500"/> : <Image size={16} className="text-purple-500"/>}
                                        {customSection.type === 'about' ? 'Quiénes Somos' : 'Galería'}
                                    </h3>
                                    <div className="flex items-center gap-1">
                                         <button onClick={() => moveSection(index, -1)} disabled={index === 0} className="p-1 text-zinc-400 hover:text-zinc-800"><ArrowUp size={14}/></button>
                                         <button onClick={() => moveSection(index, 1)} disabled={index === ((config.sectionOrder?.length || 0) - 1)} className="p-1 text-zinc-400 hover:text-zinc-800"><ArrowDown size={14}/></button>
                                         <button onClick={() => removeSection(sectionId)} className="ml-2 text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                                    </div>
                                </div>

                                {/* Editor Custom: About */}
                                {customSection.type === 'about' && (
                                    <div className="space-y-3">
                                        <input value={customSection.titulo} onChange={(e) => updateCustomSection(customSection.id, 'titulo', e.target.value)} className="w-full p-2 border rounded-lg text-sm"/>
                                        <textarea rows={4} value={customSection.texto} onChange={(e) => updateCustomSection(customSection.id, 'texto', e.target.value)} className="w-full p-2 border rounded-lg text-sm"/>
                                        <ImageUpload label="Imagen Lateral" value={customSection.imagenUrl} onChange={(url) => updateCustomSection(customSection.id, 'imagenUrl', url)} />
                                    </div>
                                )}

                                {/* Editor Custom: Gallery */}
                                {customSection.type === 'gallery' && (
                                    <div className="space-y-3">
                                        <input value={customSection.titulo} onChange={(e) => updateCustomSection(customSection.id, 'titulo', e.target.value)} className="w-full p-2 border rounded-lg text-sm font-bold"/>
                                        <div className="space-y-2">
                                            {customSection.imagenes?.map((img: any, i: number) => (
                                                <div key={i} className="flex gap-2 items-center bg-zinc-50 p-2 rounded-lg border border-zinc-200">
                                                    <img src={img.url} className="w-10 h-10 rounded object-cover bg-zinc-200" />
                                                    <input value={img.descripcion || ''} onChange={(e) => { const newImages = [...customSection.imagenes]; newImages[i].descripcion = e.target.value; updateCustomSection(customSection.id, 'imagenes', newImages); }} className="flex-1 p-1 bg-transparent text-xs border-b border-transparent focus:border-zinc-300 outline-none" placeholder="Descripción..."/>
                                                    <button onClick={() => { const newImages = customSection.imagenes.filter((_:any, idx:number) => idx !== i); updateCustomSection(customSection.id, 'imagenes', newImages); }} className="text-zinc-400 hover:text-red-500"><X size={14}/></button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-2"><ImageUpload label="Agregar Foto" value="" onChange={(url) => { const newImages = [...(customSection.imagenes || []), { url, descripcion: "" }]; updateCustomSection(customSection.id, 'imagenes', newImages); }} /></div>
                                    </div>
                                )}
                            </div>
                        );
                    }
                    return null;
                })}
            </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-5 border-t bg-white flex gap-3 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-20">
            <button onClick={onClose} className="px-6 py-3 text-zinc-500 font-bold hover:bg-zinc-100 rounded-xl text-sm transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
                {saving ? <Loader2 className="animate-spin"/> : <><Save size={18}/> Guardar Cambios</>}
            </button>
        </div>
      </div>
    </div>
  );
}