"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { Save, X, LayoutTemplate, Eye, EyeOff, Loader2, Monitor, Smartphone, ExternalLink, Palette, MousePointerClick, Layout, Layers, MapPin, Clock, PlusCircle, Trash2, Image, FileText, ArrowUp, ArrowDown, Users, DollarSign, CreditCard, Minus, Plus, Mail, Check } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Facebook, Instagram, Linkedin, Phone } from "lucide-react";

const DEFAULT_CONFIG = {
  template: "modern",
  appearance: { font: 'sans', radius: 'medium' },
  colors: { 
      primary: "#4f46e5",  
      secondary: "#f3f4f6", 
      text: "#1f2937" },
  hero: { 
    titulo: "Tu Título Principal", 
    subtitulo: "Escribe aquí una descripción atractiva.", 
    ctaTexto: "Contactar", 
    mostrar: true,
    layout: "split", 
    parallax: false,
    overlayOpacity: 50
  },
  servicios: { 
    mostrar: true, 
    titulo: "Nuestros Servicios", 
    items: [
      { titulo: "Servicio 1", desc: "Descripción breve." },
      { titulo: "Servicio 2", desc: "Descripción breve." },
      { titulo: "Servicio 3", desc: "Descripción breve." }
    ]
  },
  schedule: {
      "0": { isOpen: false, ranges: [{ start: "09:00", end: "13:00" }] }, 
      "1": { isOpen: true, ranges: [{ start: "09:00", end: "13:00" }, { start: "16:00", end: "20:00" }] }, // Ejemplo con 2 turnos
      "2": { isOpen: true, ranges: [{ start: "09:00", end: "18:00" }] },
      "3": { isOpen: true, ranges: [{ start: "09:00", end: "18:00" }] },
      "4": { isOpen: true, ranges: [{ start: "09:00", end: "18:00" }] },
      "5": { isOpen: true, ranges: [{ start: "09:00", end: "18:00" }] },
      "6": { isOpen: false, ranges: [{ start: "09:00", end: "13:00" }] }  // Sábado (Cerrado por defecto)
  },
  booking: {
    requestDeposit: false,
    depositPercentage: 50,
    requireManualConfirmation: true
  },
  equipo: { 
    mostrar: false, 
    titulo: "Nuestro Equipo", 
    subtitulo: "Profesionales expertos a tu disposición",
    items: [] 
  },
  ubicacion: { mostrar: true },
  testimonios: { mostrar: false, titulo: "Opiniones", items: [] },
  footer: { mostrar: true, textoCopyright: "Derechos reservados" },
  notifications: {
    confirmation: {
      enabled: true,
      sendViaEmail: true,
      sendViaWhatsapp: false,
      subject: "✅ Turno Confirmado: {{servicio}}",
      body: "Hola {{cliente}}, tu turno ha sido confirmado. Precio final: {{precio_total}}.",
      whatsappBody: "",
      bannerUrl: ""
    },
    reminder: {
      enabled: true,
      sendViaEmail: true,
      sendViaWhatsapp: false,
      subject: "⏰ Recordatorio: Turno mañana",
      body: "Hola {{cliente}}, te esperamos mañana a las {{fecha}}.",
      whatsappBody: "",
      bannerUrl: ""
    },
    deposit: {
      enabled: true,
      sendViaEmail: true,
      sendViaWhatsapp: false,
      subject: "📢 Solicitud recibida: Falta Seña",
      body: "Hola {{cliente}}, para confirmar tu turno debes abonar una seña de {{monto_senia}}.",
      whatsappBody: "",
      bannerUrl: ""
    }
  }
};

export default function ConfirmBookingEditor({ negocio, onClose, onSave }: any) {
  const supabase = createClient();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // REFERENCIAS PARA SCROLL
  const sectionsRefs: any = {
    contact: useRef<HTMLDivElement>(null),
    appearance: useRef<HTMLDivElement>(null),
    identity: useRef<HTMLDivElement>(null),
    hero: useRef<HTMLDivElement>(null),
    servicios: useRef<HTMLDivElement>(null),
    footer: useRef<HTMLDivElement>(null),
  };

  const [galleryTab, setGalleryTab] = useState<"upload" | "manage">("upload");

  // ESTADO DE LA CONFIGURACIÓN VISUAL (JSONB)
  const [config, setConfig] = useState({ ...DEFAULT_CONFIG, ...(negocio.config_web || {}) });
  
  // ESTADO DE DATOS DEL NEGOCIO (COLUMNAS DB)
  const [dbFields, setDbFields] = useState({
    direccion: negocio.direccion || "",
    horarios: negocio.horarios || "",
    google_maps_link: negocio.google_maps_link || "",
    whatsapp: negocio.whatsapp || "",
    instagram: negocio.instagram || "",
    facebook: negocio.facebook || "",
    linkedin: negocio.linkedin || ""
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const renderScheduleInputs = (currentSchedule: any, onUpdate: (newSched: any) => void) => {
    return ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((dayName, index) => {
        const dayKey = String(index);
        const dayConfig = currentSchedule?.[dayKey] || { isOpen: false, ranges: [{ start: "09:00", end: "18:00" }] };

        const updateDay = (updates: any) => {
            onUpdate({ ...currentSchedule, [dayKey]: { ...dayConfig, ...updates } });
        };

        return (
            <div key={dayKey} className="flex flex-col gap-2 text-xs bg-zinc-50 p-2 rounded-lg border border-zinc-200">
                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={dayConfig.isOpen} 
                            onChange={(e) => updateDay({ isOpen: e.target.checked })} 
                            className="rounded text-indigo-600 focus:ring-indigo-500 border-zinc-300" 
                        />
                        <span className={dayConfig.isOpen ? "font-bold text-zinc-700" : "text-zinc-400"}>{dayName}</span>
                    </label>
                    {dayConfig.isOpen && (dayConfig.ranges?.length || 0) < 2 && (
                        <button 
                            onClick={() => updateDay({ ranges: [...(dayConfig.ranges || []), { start: "16:00", end: "20:00" }] })} 
                            className="text-[10px] text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded border border-indigo-100 font-medium"
                        >
                            + Turno
                        </button>
                    )}
                </div>
                {dayConfig.isOpen ? (
                    <div className="space-y-2 pl-6">
                        {dayConfig.ranges?.map((range: any, rIndex: number) => (
                            <div key={rIndex} className="flex items-center gap-1 animate-in fade-in">
                                <input 
                                    type="time" 
                                    value={range.start} 
                                    onChange={(e) => {
                                        const newRanges = [...dayConfig.ranges];
                                        newRanges[rIndex].start = e.target.value;
                                        updateDay({ ranges: newRanges });
                                    }} 
                                    className="p-1.5 border border-zinc-300 rounded-md w-full bg-white text-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                />
                                <span className="text-zinc-400 font-bold">-</span>
                                <input 
                                    type="time" 
                                    value={range.end} 
                                    onChange={(e) => {
                                        const newRanges = [...dayConfig.ranges];
                                        newRanges[rIndex].end = e.target.value;
                                        updateDay({ ranges: newRanges });
                                    }} 
                                    className="p-1.5 border border-zinc-300 rounded-md w-full bg-white text-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none" 
                                />
                                {dayConfig.ranges.length > 1 && (
                                    <button onClick={() => updateDay({ ranges: dayConfig.ranges.filter((_: any, i: number) => i !== rIndex) })} className="text-zinc-400 hover:text-red-500 p-1">
                                        <Trash2 size={12}/>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="pl-6 text-zinc-400 italic text-[10px] uppercase tracking-wide">Cerrado</div>
                )}
            </div>
        );
    });
};

  // ESCUCHAR CLICS DESDE EL IFRAME
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "FOCUS_SECTION") {
            const sectionName = event.data.section;
            const targetRef = sectionsRefs[sectionName];
            if (targetRef && targetRef.current) {
                targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setActiveSection(sectionName);
                setTimeout(() => setActiveSection(null), 2000); 
            }
        }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // ENVÍO DE CAMBIOS AL IFRAME
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

  // GUARDADO EN SUPABASE (ACTUALIZA JSON Y COLUMNAS)
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("negocios").update({ 
        config_web: config,
        direccion: dbFields.direccion,
        horarios: dbFields.horarios,
        google_maps_link: dbFields.google_maps_link,
        whatsapp: dbFields.whatsapp,
        instagram: dbFields.instagram,
        facebook: dbFields.facebook,
        linkedin: dbFields.linkedin
    }).eq("id", negocio.id);

    setSaving(false);
    if (error) { alert("Error: " + error.message); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  // ACTUALIZADORES DE ESTADO
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

  const previewUrl = `/${negocio.slug}?editor=true`; 
  const getSectionClass = (name: string) => `space-y-4 bg-white p-5 rounded-xl border transition-all duration-500 ${activeSection === name ? 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-indigo-500' : 'border-zinc-200 shadow-sm'}`;
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  // Agregar una nueva sección
  const addSection = (type: 'about' | 'gallery') => {
    const newId = Math.random().toString(36).substr(2, 9);
    let newSection: any = { id: newId, type };

    if (type === 'about') {
        newSection = { ...newSection, titulo: "Sobre Nosotros", texto: "Escribe aquí tu historia...", imagenUrl: "" };
    } else if (type === 'gallery') {
        newSection = { ...newSection, titulo: "Nuestros Trabajos", imagenes: [] };
    }

    setConfig((prev: any) => {
        const currentSections = prev.customSections || [];
        const currentOrder = prev.sectionOrder || [];
        const newConfig = { ...prev, customSections: [...currentSections, newSection], sectionOrder: [...currentOrder, newId] };
        
        sendConfigUpdate(newConfig);
        return newConfig;
    });
    setIsAddMenuOpen(false);
    
    // Scroll automático hacia la nueva sección
    setTimeout(() => {
        const el = document.getElementById(`section-editor-${newId}`);
        if(el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Eliminar sección
  const removeSection = (id: string) => {
    if(!window.confirm("¿Borrar esta sección?")) return;
    setConfig((prev: any) => {
        const newSections = prev.customSections.filter((s: any) => s.id !== id);
        const newOrder = (prev.sectionOrder || []).filter((item: string) => item !== id);
        const newConfig = { ...prev, customSections: newSections };
        sendConfigUpdate(newConfig);
        return newConfig;
    });
  };

  // Actualizar datos de una sección dinámica
  const updateCustomSection = (id: string, field: string, value: any) => {
    setConfig((prev: any) => {
        const newSections = prev.customSections.map((s: any) => s.id === id ? { ...s, [field]: value } : s);
        const newConfig = { ...prev, customSections: newSections };
        sendConfigUpdate(newConfig);
        return newConfig;
    });
  };
  const updateSocial = (network: string, value: string) => {
    setConfig((prev: any) => {
        const newConfig = {
            ...prev,
            footer: {
                ...prev.footer,
                redesSociales: {
                    ...prev.footer?.redesSociales,
                    [network]: value
                }
            }
        };
        sendConfigUpdate(newConfig);
        return newConfig;
    });
  };
  // 1. GARANTIZAR QUE EXISTA UN ORDEN INICIAL
  useEffect(() => {
    // Si no existe un orden guardado, creamos uno por defecto
    if (!config.sectionOrder || config.sectionOrder.length === 0) {
        const customIds = config.customSections?.map((s:any) => s.id) || [];
        // Define aquí el orden estándar inicial
        const defaultOrder = ['hero', 'servicios', 'testimonios', 'equipo', ...customIds, 'ubicacion'];
        
        updateConfigField('root', 'sectionOrder', defaultOrder);
    }
    
  }, [config.customSections]);
  const moveSection = (index: number, direction: -1 | 1) => {
      const currentOrder = config.sectionOrder || [];
      const newOrder = [...currentOrder];
      
      const targetIndex = index + direction;
      // Evitar salirnos de los límites
      if (targetIndex < 0 || targetIndex >= newOrder.length) return;
      
      // Intercambiar posiciones
      [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
      
      updateConfigField('root', 'sectionOrder', newOrder);
  };
  return (
    <div className="w-full h-full flex bg-zinc-100 font-sans overflow-hidden">
      
      {/* --- PREVIEW AREA --- */}
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

      {/* --- SIDEBAR --- */}
      <div className="w-[400px] bg-white shadow-2xl flex flex-col h-full z-20 border-l border-zinc-200">
        <div className="p-5 border-b border-zinc-200 flex justify-between items-center bg-white sticky top-0 z-10">
            <h2 className="font-bold text-lg text-zinc-900 flex items-center gap-2"><LayoutTemplate size={20} className="text-indigo-600"/> Editor</h2>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pb-32 space-y-8 bg-zinc-50/30">
            {/*  GESTOR DE SECCIONES --- */}
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
                <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Layers size={14} className="text-zinc-400"/> Secciones Activas
                </h3>
                <div className="space-y-2">

                    {/* Toggle Servicios */}
                    <div className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg transition-colors">
                        <span className="text-sm font-medium text-zinc-600">Servicios</span>
                        <button 
                            onClick={() => updateConfigField('servicios', 'mostrar', !config.servicios?.mostrar)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.servicios?.mostrar ? 'bg-indigo-600' : 'bg-zinc-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.servicios?.mostrar ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>
                    
                    {/* Toggle Valoracion */}
                    <div className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg transition-colors">
                            <span className="text-sm font-medium text-zinc-600">Valoración</span>
                        <button onClick={() => updateConfigField('testimonios', 'mostrar', !config.testimonios?.mostrar)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.testimonios?.mostrar ? 'bg-indigo-600' : 'bg-zinc-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.testimonios?.mostrar ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>
                    {/* Toggle Equipo */}
                    <div className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg transition-colors">
                        <span className="text-sm font-medium text-zinc-600">Equipo</span>
                        <button 
                            onClick={() => updateConfigField('equipo', 'mostrar', !config.equipo?.mostrar)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.equipo?.mostrar ? 'bg-indigo-600' : 'bg-zinc-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.equipo?.mostrar ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>

                    {/* Toggle Ubicación (NUEVO) */}
                    <div className="flex items-center justify-between p-2 hover:bg-zinc-50 rounded-lg transition-colors">
                        <span className="text-sm font-medium text-zinc-600">Ubicación y Mapa</span>
                        <button 
                            onClick={() => updateConfigField('ubicacion', 'mostrar', !config.ubicacion?.mostrar)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.ubicacion?.mostrar ? 'bg-indigo-600' : 'bg-zinc-200'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.ubicacion?.mostrar ? 'translate-x-6' : 'translate-x-1'}`}/>
                        </button>
                    </div>

                    
                    {/* BOTÓN AGREGAR SECCIÓN */}
                    <div className="pt-4 border-t border-zinc-100 relative">
                        <button 
                            onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                            className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 font-bold text-sm hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                        >
                            <PlusCircle size={18}/> Agregar Sección
                        </button>

                        {/* Menú Desplegable */}
                        {isAddMenuOpen && (
                            <div className="absolute top-full left-0 w-full mt-2 bg-white border border-zinc-200 shadow-xl rounded-xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                                <button onClick={() => addSection('about')} className="w-full text-left px-4 py-3 hover:bg-zinc-50 flex items-center gap-3 text-sm font-medium text-zinc-700">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FileText size={16}/></div>
                                    Quiénes Somos (Texto + Foto)
                                </button>
                                <button onClick={() => addSection('gallery')} className="w-full text-left px-4 py-3 hover:bg-zinc-50 flex items-center gap-3 text-sm font-medium text-zinc-700 border-t border-zinc-100">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Image size={16}/></div>
                                    Galería de Trabajos
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* 1. SECCIÓN CONTACTO */}
            <div ref={sectionsRefs.contact} className={getSectionClass('contact')}>
                <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-100">
                    <MapPin size={16} className="text-blue-500" /> Información de Contacto
                </h3>
                {/* DIRECCIÓN */}
                <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Dirección</label>
                    <input 
                        type="text" 
                        value={dbFields.direccion} 
                        onChange={(e) => updateDbField('direccion', e.target.value)} 
                        className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                {/* INPUT NUEVO PARA GOOGLE MAPS */}
                <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Link Google Maps</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={dbFields.google_maps_link} 
                            onChange={(e) => updateDbField('google_maps_link', e.target.value)} 
                            className="w-full p-2 pl-8 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <ExternalLink size={14} className="absolute left-2.5 top-2.5 text-zinc-400"/>
                    </div>
                </div>
                {/* TELÉFONO (NUEVO) */}
                <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Teléfono / WhatsApp</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={dbFields.whatsapp} 
                            onChange={(e) => updateDbField('whatsapp', e.target.value)} 
                            className="w-full p-2 pl-8 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej: 54911..."
                        />
                        <Phone size={14} className="absolute left-2.5 top-2.5 text-zinc-400"/>
                    </div>
                </div>
                {/* BLOQUE DE CONFIGURACIÓN DE AGENDA (Centralizado) */}
                <div className="pt-4 border-t border-zinc-100 mt-4">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-3 block flex items-center gap-2">
                        <Clock size={12}/> Configuración de Agenda
                    </label>
                    
                    {/* 1. Selector de Modo: General vs Individual */}
                    <div className="flex bg-zinc-100 p-1 rounded-xl mb-4 border border-zinc-200">
                        <button 
                            onClick={() => updateConfigField('equipo', 'scheduleType', 'unified')}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${(!config.equipo?.scheduleType || config.equipo.scheduleType === 'unified') ? 'bg-white shadow text-indigo-600' : 'text-zinc-500'}`}
                        >
                            Horario General
                        </button>
                        <button 
                            onClick={() => updateConfigField('equipo', 'scheduleType', 'per_worker')}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${config.equipo?.scheduleType === 'per_worker' ? 'bg-white shadow text-indigo-600' : 'text-zinc-500'}`}
                        >
                            Por Trabajador
                        </button>
                    </div>

                    {/* 2. Selector de Trabajador (Solo aparece en modo Individual) */}
                    {config.equipo?.scheduleType === 'per_worker' && (
                        <div className="mb-4 animate-in fade-in slide-in-from-top-1">
                            <label className="text-[10px] font-bold text-indigo-500 uppercase mb-1 block">Seleccionar Profesional</label>
                            <select 
                                value={selectedWorkerId || ""} 
                                onChange={(e) => setSelectedWorkerId(e.target.value)}
                                className="w-full p-2.5 border border-indigo-200 rounded-lg text-sm bg-indigo-50/30 outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">-- Elige un profesional --</option>
                                {config.equipo?.items?.map((w: any) => (
                                    <option key={w.id} value={w.id}>{w.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* 3. Renderizado Dinámico de Horarios */}
                    <div className="space-y-2" key={selectedWorkerId || 'global'}>
                        {config.equipo?.scheduleType === 'per_worker' ? (
                            selectedWorkerId ? (
                                // Si hay trabajador elegido, editamos su schedule particular
                                renderScheduleInputs(
                                    // Buscamos el horario del trabajador, si no tiene, usamos el global como base
                                    config.equipo.items.find((w: any) => w.id === selectedWorkerId)?.schedule || config.schedule,
                                    (newSched) => {
                                        const idx = config.equipo.items.findIndex((w: any) => w.id === selectedWorkerId);
                                        if (idx !== -1) {
                                            updateArrayItem('equipo', idx, 'schedule', newSched);
                                        }
                                    }
                                )
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-zinc-200 rounded-2xl bg-zinc-50/50">
                                    <div className="bg-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-zinc-100">
                                        <Users size={20} className="text-zinc-400"/>
                                    </div>
                                    <p className="text-zinc-500 text-xs font-medium">Selecciona un profesional arriba</p>
                                    <p className="text-[10px] text-zinc-400 mt-1">Para configurar su disponibilidad específica</p>
                                </div>
                            )
                        ) : (
                            // Modo General: Editamos el schedule raíz del negocio
                            renderScheduleInputs(
                                config.schedule, 
                                (newSched) => updateConfigField('root', 'schedule', newSched)
                            )
                        )}
                    </div>

                    <p className="text-[10px] text-zinc-400 mt-2">
                        * Estos horarios controlan la disponibilidad real del calendario.
                    </p>
                </div>
                {/* REDES SOCIALES (NUEVO BLOQUE) */}
                <div className="pt-4 border-t border-zinc-100 mt-2">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-2 block">Redes Sociales</label>
                    <div className="space-y-2">
                        
                        {/* INPUT: INSTAGRAM */}
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                                <Instagram size={16}/>
                            </div>
                            <input 
                                type="text" 
                                /* AQUÍ ESTÁ EL CAMBIO: Usamos dbFields.instagram */
                                value={dbFields.instagram} 
                                /* Y usamos updateDbField para guardar */
                                onChange={(e) => updateDbField('instagram', e.target.value)} 
                                className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-pink-500 outline-none"
                                placeholder="Link de Instagram"
                            />
                        </div>

                        {/* INPUT: FACEBOOK */}
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Facebook size={16}/>
                            </div>
                            <input 
                                type="text" 
                                value={dbFields.facebook} 
                                onChange={(e) => updateDbField('facebook', e.target.value)} 
                                className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-600 outline-none"
                                placeholder="Link de Facebook"
                            />
                        </div>

                         {/* INPUT: LINKEDIN */}
                         <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                                <Linkedin size={16}/>
                            </div>
                            <input 
                                type="text" 
                                value={dbFields.linkedin} 
                                onChange={(e) => updateDbField('linkedin', e.target.value)} 
                                className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-sky-600 outline-none"
                                placeholder="Link de LinkedIn"
                            />
                        </div>
                    </div>
                </div>
            </div>
            {/* BLOQUE: POLÍTICA DE SEÑAS Y PAGOS Y RESERVAS */}
            <div className="pt-4 border-t border-zinc-100 mt-4">
                <label className="text-[11px] font-bold text-zinc-400 uppercase mb-3 block flex items-center gap-2">
                    <DollarSign size={12}/> Política de Reservas
                </label>
                
                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-3">
                    
                    {/* --- NUEVO: Switch Confirmación Manual --- */}
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60">
                        <div className="pr-4">
                            <span className="text-sm font-medium text-zinc-700">Confirmación Manual</span>
                            <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">
                                Si está activo, deberás aprobar cada turno. Si lo apagas, se confirmarán al instante.
                            </p>
                        </div>
                        <button 
                            onClick={() => updateConfigField('booking', 'requireManualConfirmation', !(config.booking?.requireManualConfirmation ?? true))}
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${(config.booking?.requireManualConfirmation ?? true) ? 'bg-indigo-600' : 'bg-zinc-300'}`}
                        >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${(config.booking?.requireManualConfirmation ?? true) ? 'translate-x-5' : 'translate-x-1'}`}/>
                        </button>
                    </div>
                    {/* --- FIN NUEVO --- */}

                    {/* Switch: Pedir Seña (Este es el que ya tenías) */}
                    <div className="flex items-center justify-between pt-1">
                        <span className="text-sm font-medium text-zinc-700">Solicitar Seña/Depósito</span>
                        <button 
                            onClick={() => updateConfigField('booking', 'requestDeposit', !config.booking?.requestDeposit)}
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${config.booking?.requestDeposit ? 'bg-indigo-600' : 'bg-zinc-300'}`}
                        >
                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${config.booking?.requestDeposit ? 'translate-x-5' : 'translate-x-1'}`}/>
                        </button>
                    </div>

                        {/* Input: Porcentaje (Solo si está activo) */}
                        {config.booking?.requestDeposit && (
                            <div className="animate-in fade-in slide-in-from-top-1">
                                <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">
                                    Porcentaje de Seña (%)
                                </label>
                                <div className="relative">
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="100"
                                        value={config.booking?.depositPercentage || 50} 
                                        onChange={(e) => updateConfigField('booking', 'depositPercentage', Number(e.target.value))} 
                                        className="w-full p-2 pl-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <span className="absolute right-3 top-2 text-zinc-400 text-sm font-bold">%</span>
                                </div>
                                <p className="text-[10px] text-zinc-400 mt-1">
                                    El cliente recibirá un correo solicitando el {config.booking?.depositPercentage}% del total.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

            {/* BLOQUE: NOTIFICACIONES POR CANALES */}
            <div className="pt-4 border-t border-zinc-100 mt-4">
                <label className="text-[11px] font-bold text-zinc-400 uppercase mb-3 block flex items-center gap-2">
                    <Mail size={12}/> Personalizar Notificaciones
                </label>
                
                <div className="bg-zinc-50 p-1 rounded-lg border border-zinc-200">
                    {/* Pestañas de tipos de notificación */}
                    <div className="flex p-1 gap-1 mb-2">
                        <button onClick={() => updateConfigField('root', '_mailTab', 'confirmation')} className={`flex-1 py-1.5 text-[10px] font-bold rounded ${(!config._mailTab || config._mailTab === 'confirmation') ? 'bg-white shadow text-indigo-600' : 'text-zinc-500'}`}>Confirmación</button>
                        <button onClick={() => updateConfigField('root', '_mailTab', 'deposit')} className={`flex-1 py-1.5 text-[10px] font-bold rounded ${config._mailTab === 'deposit' ? 'bg-white shadow text-indigo-600' : 'text-zinc-500'}`}>Seña</button>
                        <button onClick={() => updateConfigField('root', '_mailTab', 'reminder')} className={`flex-1 py-1.5 text-[10px] font-bold rounded ${config._mailTab === 'reminder' ? 'bg-white shadow text-indigo-600' : 'text-zinc-500'}`}>Recordatorio</button>
                    </div>

                    {/* Editor del Template Activo */}
                    {(() => {
                        const activeType = config._mailTab || 'confirmation';
                        const template = config.notifications?.[activeType] || DEFAULT_CONFIG.notifications[activeType as keyof typeof DEFAULT_CONFIG.notifications];
                        
                        return (
                            <div className="p-2 space-y-3 animate-in fade-in">
                                {/* Switch Enabled Principal */}
                                <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                                    <span className="text-xs font-bold text-zinc-700">Activar esta notificación</span>
                                    <input 
                                        type="checkbox" 
                                        checked={template.enabled}
                                        onChange={(e) => updateConfigField('notifications', activeType, { ...template, enabled: e.target.checked })}
                                        className="accent-indigo-600"
                                    />
                                </div>

                                {/* NUEVO: Checkboxes de Canales (Solo visibles si la notificación general está activa) */}
                                {template.enabled && (
                                    <div className="flex gap-4 pb-2 border-b border-zinc-200 border-dashed">
                                        <label className="flex items-center gap-2 text-xs text-zinc-600 font-medium cursor-pointer hover:text-indigo-600 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={template.sendViaEmail !== false} // true por defecto
                                                onChange={(e) => updateConfigField('notifications', activeType, { ...template, sendViaEmail: e.target.checked })}
                                                className="accent-indigo-600 rounded w-3.5 h-3.5"
                                            />
                                            ✉️ Por Email
                                        </label>
                                        <label className="flex items-center gap-2 text-xs text-zinc-600 font-medium cursor-pointer hover:text-green-600 transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={template.sendViaWhatsapp === true}
                                                onChange={(e) => updateConfigField('notifications', activeType, { ...template, sendViaWhatsapp: e.target.checked })}
                                                className="accent-green-600 rounded w-3.5 h-3.5"
                                            />
                                            💬 Por WhatsApp
                                        </label>
                                    </div>
                                )}

                                {/* Asunto */}
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Asunto (Para Email / Título WA)</label>
                                    <input 
                                        value={template.subject}
                                        onChange={(e) => updateConfigField('notifications', activeType, { ...template, subject: e.target.value })}
                                        className="w-full p-2 border rounded-lg text-sm bg-white"
                                    />
                                </div>
                                
                                {/* Cuerpo */}

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-zinc-400 uppercase">Mensaje Email (HTML)</label>
                                        <textarea 
                                            rows={4}
                                            value={template.body}
                                            onChange={(e) => updateConfigField('notifications', activeType, { ...template, body: e.target.value })}
                                            className="w-full p-2 border rounded-lg text-sm bg-white"
                                        />
                                    </div>

                                    {template.sendViaWhatsapp && (
                                        <div className="animate-in fade-in slide-in-from-top-1">
                                            <label className="text-[10px] font-bold text-green-600 uppercase">Mensaje WhatsApp (Texto Plano)</label>
                                            <textarea 
                                                rows={4}
                                                value={template.whatsappBody || ""}
                                                placeholder="Hola {{cliente}}, tu turno..."
                                                onChange={(e) => updateConfigField('notifications', activeType, { ...template, whatsappBody: e.target.value })}
                                                className="w-full p-2 border border-green-200 rounded-lg text-sm bg-green-50/30"
                                            />
                                            <p className="text-[9px] text-green-600 mt-1 italic">Este mensaje se enviará junto con la imagen del banner si está configurada.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Banner */}
                                {template.sendViaEmail !== false && (
                                    <div className="pt-2">
                                        <ImageUpload 
                                            label="Banner / Cabecera (Solo Email)" 
                                            value={template.bannerUrl} 
                                            onChange={(url) => updateConfigField('notifications', activeType, { ...template, bannerUrl: url })} 
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* 2. SECCIÓN APARIENCIA */}
            <div ref={sectionsRefs.appearance} className={getSectionClass('appearance')}>
                <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-100">
                    <Palette size={16} className="text-purple-500" /> Apariencia
                </h3>

                {/* --- NUEVO: GESTOR DE COLORES --- */}
                <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-2 block">Paleta de Colores</label>
                    <div className="grid grid-cols-1 gap-3">
                        
                        {/* Color Principal */}
                        <div className="flex items-center justify-between p-2 border border-zinc-200 rounded-lg bg-zinc-50">
                            <span className="text-xs font-medium text-zinc-600">Principal</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-400 font-mono uppercase">{config.colors?.primary}</span>
                                <input 
                                    type="color" 
                                    value={config.colors?.primary || "#000000"} 
                                    onChange={(e) => updateConfigField('colors', 'primary', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                />
                            </div>
                        </div>

                        {/* Color Secundario */}
                        <div className="flex items-center justify-between p-2 border border-zinc-200 rounded-lg bg-zinc-50">
                            <span className="text-xs font-medium text-zinc-600">Fondo / Secundario</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-400 font-mono uppercase">{config.colors?.secondary}</span>
                                <input 
                                    type="color" 
                                    value={config.colors?.secondary || "#ffffff"} 
                                    onChange={(e) => updateConfigField('colors', 'secondary', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                />
                            </div>
                        </div>

                        {/* Color de Texto */}
                        <div className="flex items-center justify-between p-2 border border-zinc-200 rounded-lg bg-zinc-50">
                            <span className="text-xs font-medium text-zinc-600">Texto</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-400 font-mono uppercase">{config.colors?.text}</span>
                                <input 
                                    type="color" 
                                    value={config.colors?.text || "#000000"} 
                                    onChange={(e) => updateConfigField('colors', 'text', e.target.value)}
                                    className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Selectores anteriores (Tipografía y Bordes) */}
                <div className="pt-2 border-t border-zinc-100 mt-2">
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Tipografía</label>
                    <select value={config.appearance?.font || 'sans'} onChange={(e) => updateConfigField('appearance', 'font', e.target.value)} className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white">
                        <option value="sans">Moderna (Sans)</option>
                        <option value="serif">Elegante (Serif)</option>
                        <option value="mono">Técnica (Mono)</option>
                    </select>
                </div>
                
                <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Bordes</label>
                    <div className="flex gap-2">
                        {['none', 'medium', 'full'].map((mode) => (
                            <button key={mode} onClick={() => updateConfigField('appearance', 'radius', mode)} className={`flex-1 py-2 text-xs border rounded-lg ${config.appearance?.radius === mode ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold' : 'bg-white'}`}>{mode}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. IDENTIDAD */}
            <div ref={sectionsRefs.identity} className={getSectionClass('identity')}>
                <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2 pb-3 border-b border-zinc-100"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Identidad</h3>
                <ImageUpload label="Logo" value={config.logoUrl} onChange={(url) => updateConfigField('root', 'logoUrl', url)} />
            </div>

            {/* 4. HERO */}
            <div ref={sectionsRefs.hero} className={getSectionClass('hero')}>
                <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                    <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Portada</h3>
                    <button onClick={() => updateConfigField('hero', 'mostrar', !config.hero?.mostrar)} className="text-zinc-400 hover:text-indigo-600"><Eye size={16}/></button>
                </div>
                {config.hero?.mostrar && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                            <label className="text-[11px] font-bold text-zinc-400 uppercase mb-2 block flex items-center gap-1"><Layout size={12}/> Diseño</label>
                            <div className="flex gap-2">
                                <button onClick={() => updateConfigField('hero', 'layout', 'split')} className={`flex-1 py-2 text-xs border rounded-lg ${config.hero?.layout !== 'full' ? 'bg-white border-indigo-500 text-indigo-700 font-bold' : ''}`}>Dividido</button>
                                <button onClick={() => updateConfigField('hero', 'layout', 'full')} className={`flex-1 py-2 text-xs border rounded-lg ${config.hero?.layout === 'full' ? 'bg-white border-indigo-500 text-indigo-700 font-bold' : ''}`}>Cinemático</button>
                            </div>
                        </div>
                        {config.hero?.layout === 'full' && (
                            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-zinc-600 flex items-center gap-2"><Layers size={14}/> Efecto Parallax</label>
                                    <button onClick={() => updateConfigField('hero', 'parallax', !config.hero?.parallax)} className={`w-10 h-6 rounded-full p-1 transition-colors ${config.hero?.parallax ? 'bg-indigo-600' : 'bg-zinc-300'}`}>
                                        <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${config.hero?.parallax ? 'translate-x-4' : ''}`}></div>
                                    </button>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">Oscuridad ({config.hero?.overlayOpacity || 50}%)</label>
                                    <input type="range" min="0" max="90" value={config.hero?.overlayOpacity || 50} onChange={(e) => updateConfigField('hero', 'overlayOpacity', e.target.value)} className="w-full accent-indigo-600"/>
                                </div>
                            </div>
                        )}
                        <input type="text" value={config.hero.titulo} onChange={(e) => updateConfigField('hero', 'titulo', e.target.value)} className="w-full p-2 border rounded text-sm"/>
                        <textarea rows={3} value={config.hero.subtitulo} onChange={(e) => updateConfigField('hero', 'subtitulo', e.target.value)} className="w-full p-2 border rounded text-sm"/>
                        <ImageUpload label="Imagen de Fondo" value={config.hero.imagenUrl} onChange={(url) => updateConfigField('hero', 'imagenUrl', url)} />
                    </div>
                )}
            </div>
            <div className="space-y-8 mt-8">
                <div className="px-1 text-xs font-bold text-zinc-400 uppercase tracking-wider">Contenido de la Página</div>
                {(config.sectionOrder || []).map((sectionId: string, index: number) => {
                    
                    // HEADER COMÚN CON FLECHAS
                    const SectionHeader = ({ title, icon, toggleField, toggleSection }: any) => (
                        <div className="flex justify-between items-center pb-3 border-b border-zinc-100 mb-4">
                            <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2">
                                {icon} {title}
                            </h3>
                            <div className="flex items-center gap-1">
                                {/* FLECHAS DE ORDEN */}
                                <button onClick={() => moveSection(index, -1)} disabled={index === 0} className="p-1 text-zinc-400 hover:text-zinc-800 disabled:opacity-30"><ArrowUp size={14}/></button>
                                <button onClick={() => moveSection(index, 1)} disabled={index === ((config.sectionOrder?.length || 0) - 1)} className="p-1 text-zinc-400 hover:text-zinc-800 disabled:opacity-30"><ArrowDown size={14}/></button>
                                
                                {/* TOGGLE VISIBILIDAD (Si aplica) */}
                                {toggleField && (
                                    <button onClick={() => updateConfigField(toggleSection, toggleField, !config[toggleSection]?.[toggleField])} className="ml-2 text-zinc-400 hover:text-indigo-600">
                                        {config[toggleSection]?.[toggleField] ? <Eye size={16}/> : <EyeOff size={16}/>}
                                    </button>
                                )}
                            </div>
                        </div>
                    );

                    {/* 5. SERVICIOS (DINÁMICO) */}
                    if (sectionId === 'servicios') return (
                        <div key="servicios" ref={sectionsRefs.servicios} className={getSectionClass('servicios')}>
                            <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                                <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Servicios
                                </h3>
                                <button onClick={() => updateConfigField('servicios', 'mostrar', !config.servicios?.mostrar)} className="text-zinc-400 hover:text-emerald-600">
                                    {config.servicios?.mostrar ? <Eye size={16}/> : <EyeOff size={16}/>}
                                </button>
                            </div>
                            
                            {config.servicios?.mostrar && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    {/* Título de la sección */}
                                    <input 
                                        type="text" 
                                        value={config.servicios.titulo} 
                                        onChange={(e) => updateConfigField('servicios', 'titulo', e.target.value)} 
                                        className="w-full p-2 border rounded-lg text-sm font-bold bg-zinc-50"
                                        placeholder="Título de la sección (Ej: Nuestros Servicios)"
                                    />

                                    {/* LISTA DE SERVICIOS */}
                                    <div className="space-y-3">
                                        {config.servicios.items?.map((item: any, i: number) => (
                                            <div key={i} className="p-3 border border-zinc-200 rounded-xl bg-white relative group shadow-sm hover:shadow-md transition-all">
                                                
                                                {/* Botón Eliminar (X) */}
                                                <button 
                                                    onClick={() => {
                                                        const newItems = config.servicios.items.filter((_:any, idx:number) => idx !== i);
                                                        updateConfigField('servicios', 'items', newItems);
                                                    }}
                                                    className="absolute top-2 right-2 p-1 text-zinc-300 hover:text-red-500 transition-colors"
                                                    title="Eliminar servicio"
                                                >
                                                    <X size={16}/>
                                                </button>

                                                <div className="space-y-3 pr-6">
                                                    {/* Título */}
                                                    <div>
                                                        <label className="text-[10px] font-bold text-zinc-400 uppercase">Nombre del Servicio</label>
                                                        <input 
                                                            value={item.titulo} 
                                                            onChange={(e) => updateArrayItem('servicios', i, 'titulo', e.target.value)} 
                                                            className="w-full p-2 border rounded-lg text-sm font-medium"
                                                            placeholder="Ej: Corte de Pelo"
                                                        />
                                                    </div>

                                                    {/* Precio y Duración (Grid) */}
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-zinc-400 uppercase">Precio</label>
                                                            <input 
                                                                value={item.precio || ''} 
                                                                onChange={(e) => updateArrayItem('servicios', i, 'precio', e.target.value)} 
                                                                className="w-full p-2 border rounded-lg text-sm"
                                                                placeholder="$0.00"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-zinc-400 uppercase">Duración (min)</label>
                                                            <div className="flex items-center gap-3 bg-white p-1 rounded-lg border border-zinc-200">
                                                                {/* Botón Restar */}
                                                                <button 
                                                                    onClick={() => {
                                                                        const current = Number(item.duracion || 60);
                                                                        let newVal = current;
                                                                        if (current <= 60) {
                                                                            newVal = Math.max(15, current - 15);
                                                                        } else {
                                                                            newVal = current - 30;
                                                                        }
                                                                        // CAMBIO: de 'index' a 'i'
                                                                        updateArrayItem('servicios', i, 'duracion', newVal.toString());
                                                                    }}
                                                                    className="w-8 h-8 flex items-center justify-center ..."
                                                                >
                                                                    <Minus size={14} />
                                                                </button>

                                                                {/* Visualizador de Texto */}
                                                                <div className="flex-1 text-center min-w-[60px]">
                                                                    <span className="text-xs font-bold text-zinc-700 block">
                                                                        {Number(item.duracion || 60) < 60 
                                                                            ? `${item.duracion || 60} min`
                                                                            : Number(item.duracion || 60) === 60 
                                                                                ? "1 hora"
                                                                                : (() => {
                                                                                    const h = Math.floor(Number(item.duracion || 60) / 60);
                                                                                    const m = Number(item.duracion || 60) % 60;
                                                                                    return `${h}h ${m > 0 ? `${m}m` : ''}`;
                                                                                })()
                                                                        }
                                                                    </span>
                                                                </div>

                                                                {/* Botón Sumar */}
                                                                <button 
                                                                    onClick={() => {
                                                                        const current = Number(item.duracion || 60);
                                                                        let newVal = current;
                                                                        if (current < 60) {
                                                                            newVal = current + 15;
                                                                        } else {
                                                                            newVal = current + 30;
                                                                        }
                                                                        // CAMBIO: de 'index' a 'i'
                                                                        updateArrayItem('servicios', i, 'duracion', newVal.toString());
                                                                    }}
                                                                    className="w-8 h-8 flex items-center justify-center ..."
                                                                >
                                                                    <Plus size={14} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Descripción */}
                                                    <div>
                                                        <label className="text-[10px] font-bold text-zinc-400 uppercase">Descripción</label>
                                                        <textarea 
                                                            value={item.desc} 
                                                            onChange={(e) => updateArrayItem('servicios', i, 'desc', e.target.value)} 
                                                            className="w-full p-2 border rounded-lg text-sm text-zinc-600"
                                                            rows={2}
                                                        />
                                                    </div>

                                                    {/* --- AGREGAR ESTO: Subida de Imagen --- */}
                                                    <div className="mt-3 pt-3 border-t border-zinc-100">
                                                        <ImageUpload 
                                                            label="Imagen de Referencia (Opcional)" 
                                                            value={item.imagenUrl} 
                                                            onChange={(url) => updateArrayItem('servicios', i, 'imagenUrl', url)} 
                                                        />
                                                    </div>
                                                    {/* --- LÓGICA DE PROMOCIONES (NUEVO) --- */}
                                                    <div className="mt-3 pt-3 border-t border-zinc-100">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="text-[10px] font-bold text-zinc-400 uppercase flex items-center gap-1">
                                                                ¿Es una promoción especial?
                                                            </label>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={item.isPromo || false}
                                                                onChange={(e) => {
                                                                    const checked = e.target.checked;
                                                                    setConfig((prev: any) => {
                                                                        const newItems = [...(prev.servicios?.items || [])];
                                                                        newItems[i] = { ...newItems[i], isPromo: checked };
                                                                        
                                                                        // Si activa la promo y no hay fecha, le damos 30 días por defecto
                                                                        if (checked && !newItems[i].promoEndDate) {
                                                                            const future = new Date();
                                                                            future.setDate(future.getDate() + 30);
                                                                            newItems[i].promoEndDate = future.toISOString().split('T')[0];
                                                                        } else if (!checked) {
                                                                            newItems[i].promoEndDate = null; // Limpiamos si desactiva
                                                                        }
                                                                        
                                                                        const newConfig = { ...prev, servicios: { ...prev.servicios, items: newItems } };
                                                                        sendConfigUpdate(newConfig);
                                                                        return newConfig;
                                                                    });
                                                                }}
                                                                className="w-4 h-4 accent-pink-600 rounded cursor-pointer"
                                                            />
                                                        </div>
                                                        
                                                        {/* Mostrar el selector de fecha SOLO si el checkbox está activo */}
                                                        {item.isPromo && (
                                                            <div className="animate-in fade-in slide-in-from-top-1 mt-2">
                                                                <label className="text-[10px] font-bold text-pink-600 uppercase mb-1 block">
                                                                    Fecha de Vencimiento de Promo
                                                                </label>
                                                                <input 
                                                                    type="date"
                                                                    min={new Date().toISOString().split('T')[0]} // No permite fechas pasadas
                                                                    value={item.promoEndDate || ''}
                                                                    onChange={(e) => updateArrayItem('servicios', i, 'promoEndDate', e.target.value)}
                                                                    className="w-full p-2 border border-pink-200 rounded-lg text-sm bg-pink-50 text-pink-900 focus:ring-2 focus:ring-pink-500 outline-none"
                                                                />
                                                                <p className="text-[9px] text-pink-600/80 mt-1">
                                                                    La oferta desaparecerá automáticamente cuando pase esta fecha.
                                                                </p>
                                                            </div>

                                                        )}
                                                    </div>
                                                    {/* --- NUEVO: ASIGNACIÓN DE PROFESIONALES --- */}
                                                {config.equipo?.mostrar && config.equipo?.items?.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-zinc-100">
                                                        <label className="text-[10px] font-bold text-zinc-400 uppercase mb-2 block flex items-center gap-1">
                                                            <Users size={12}/> Profesionales que lo realizan
                                                        </label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {config.equipo.items.map((worker: any) => {
                                                                const isChecked = item.workerIds?.includes(worker.id) || false;
                                                                return (
                                                                    <label key={worker.id} className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-medium cursor-pointer transition-colors ${isChecked ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50'}`}>
                                                                        <input 
                                                                            type="checkbox" 
                                                                            className="hidden"
                                                                            checked={isChecked}
                                                                            onChange={(e) => {
                                                                                const currentIds = item.workerIds || [];
                                                                                const newIds = e.target.checked 
                                                                                    ? [...currentIds, worker.id] 
                                                                                    : currentIds.filter((id: string) => id !== worker.id);
                                                                                updateArrayItem('servicios', i, 'workerIds', newIds);
                                                                            }}
                                                                        />
                                                                        <div className={`w-2 h-2 rounded-full ${isChecked ? 'bg-indigo-500' : 'bg-zinc-300'}`}></div>
                                                                        {worker.nombre}
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                        <p className="text-[9px] text-zinc-400 mt-1">Si no seleccionas ninguno, se asume que todos pueden hacerlo.</p>
                                                    </div>
                                                )}
                                                {/* --- FIN NUEVO --- */}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* BOTÓN AGREGAR SERVICIO */}
                                    <button 
                                        onClick={() => {
                                            const newItem = { titulo: "Nuevo Servicio", desc: "", precio: "", duracion: 60, isPromo: false, promoEndDate: null };
                                            const newItems = [...(config.servicios.items || []), newItem];
                                            updateConfigField('servicios', 'items', newItems);
                                        }}
                                        className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 font-bold text-sm hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <PlusCircle size={18}/> Agregar Servicio
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                    if (sectionId === 'equipo') return (
                        <div key="equipo" className={getSectionClass('equipo')}>
                            <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                                <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Equipo
                                </h3>
                                <button onClick={() => updateConfigField('equipo', 'mostrar', !config.equipo?.mostrar)} className="text-zinc-400 hover:text-blue-600">
                                    {config.equipo?.mostrar ? <Eye size={16}/> : <EyeOff size={16}/>}
                                </button>
                            </div>
                            
                            {config.equipo?.mostrar && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <label className="text-[10px] font-bold text-blue-800 uppercase block mb-2">Lógica de Turnos</label>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => updateConfigField('equipo', 'availabilityMode', 'global')}
                                                className={`flex-1 py-2 px-2 text-xs border rounded-lg transition-all ${(!config.equipo.availabilityMode || config.equipo.availabilityMode === 'global') ? 'bg-white border-blue-500 text-blue-700 font-bold shadow-sm' : 'bg-transparent border-transparent text-blue-400 hover:bg-blue-100/50'}`}
                                            >
                                                Sala Única
                                                <span className="block text-[9px] font-normal opacity-70 mt-1">Un turno bloquea a todos</span>
                                            </button>
                                            <button 
                                                onClick={() => updateConfigField('equipo', 'availabilityMode', 'per_worker')}
                                                className={`flex-1 py-2 px-2 text-xs border rounded-lg transition-all ${config.equipo.availabilityMode === 'per_worker' ? 'bg-white border-blue-500 text-blue-700 font-bold shadow-sm' : 'bg-transparent border-transparent text-blue-400 hover:bg-blue-100/50'}`}
                                            >
                                                Simultáneo
                                                <span className="block text-[9px] font-normal opacity-70 mt-1">Bloqueo por profesional</span>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <input 
                                        value={config.equipo.titulo} 
                                        onChange={(e) => updateConfigField('equipo', 'titulo', e.target.value)} 
                                        className="w-full p-2 border rounded-lg text-sm font-bold bg-zinc-50"
                                        placeholder="Título (Ej: Nuestro Equipo)"
                                    />
                                    <input 
                                        value={config.equipo.subtitulo || ''} 
                                        onChange={(e) => updateConfigField('equipo', 'subtitulo', e.target.value)} 
                                        className="w-full p-2 border rounded-lg text-sm bg-zinc-50"
                                        placeholder="Subtítulo (Opcional)"
                                    />

                                    <div className="space-y-3">
                                        {config.equipo.items?.map((item: any, i: number) => (
                                            <div key={i} className="p-3 border border-zinc-200 rounded-xl bg-white relative group">
                                                <button 
                                                    onClick={() => {
                                                        const newItems = config.equipo.items.filter((_:any, idx:number) => idx !== i);
                                                        updateConfigField('equipo', 'items', newItems);
                                                    }}
                                                    className="absolute top-2 right-2 p-1 text-zinc-300 hover:text-red-500"
                                                >
                                                    <X size={16}/>
                                                </button>

                                                <div className="flex gap-3 items-start pr-6">
                                                    <div className="w-12 h-12 shrink-0 bg-zinc-100 rounded-full overflow-hidden">
                                                        {item.imagenUrl ? <img src={item.imagenUrl} className="w-full h-full object-cover"/> : <Users size={24} className="m-3 text-zinc-300"/>}
                                                    </div>
                                                    
                                                    <div className="space-y-2 flex-1">
                                                        <input 
                                                            value={item.nombre} 
                                                            onChange={(e) => updateArrayItem('equipo', i, 'nombre', e.target.value)} 
                                                            className="w-full p-1.5 border rounded text-sm font-bold"
                                                            placeholder="Nombre"
                                                        />
                                                        <input 
                                                            value={item.cargo} 
                                                            onChange={(e) => updateArrayItem('equipo', i, 'cargo', e.target.value)} 
                                                            className="w-full p-1.5 border rounded text-xs text-zinc-500"
                                                            placeholder="Cargo / Rol"
                                                        />
                                                        {/* Nuevo campo de Email */}
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-gray-100 rounded">
                                                                <Mail size={14} className="text-gray-500"/>
                                                            </div>
                                                            <input 
                                                                value={item.email || ''} 
                                                                onChange={(e) => updateArrayItem('equipo', i, 'email', e.target.value)} 
                                                                className="w-full p-1.5 border rounded text-xs"
                                                                placeholder="Email para avisos de turnos"
                                                            />
                                                        </div>
                                                        {/* INPUT: LINK DE PAGO */}
                                                        <div className="bg-indigo-50 p-2 rounded border border-indigo-100">
                                                            <label className="text-[9px] font-bold text-indigo-800 uppercase block mb-1 flex items-center gap-1">
                                                                <CreditCard size={10}/> Link de pago (MP)
                                                            </label>
                                                            <input 
                                                                value={item.paymentLink || ''} 
                                                                onChange={(e) => updateArrayItem('equipo', i, 'paymentLink', e.target.value)} 
                                                                className="w-full p-1 bg-white border border-indigo-200 rounded text-[10px] focus:ring-1 focus:ring-indigo-500 outline-none"
                                                                placeholder="Ej: https://mpago.la/123456789"
                                                            />
                                                            <p className="text-[9px] text-indigo-600/80 mt-1 leading-tight">
                                                                Link Mercado Pago (opcional).
                                                            </p>
                                                        </div>
                                                        {/* INPUT: ALIAS / CVU */}
                                                        <div className="bg-emerald-50 p-2 rounded border border-emerald-100 mt-2">
                                                            <label className="text-[9px] font-bold text-emerald-800 uppercase block mb-1">
                                                                Alias / CBU / CVU para seña
                                                            </label>
                                                            <input 
                                                                value={item.aliasCvu || ''} 
                                                                onChange={(e) => updateArrayItem('equipo', i, 'aliasCvu', e.target.value)} 
                                                                className="w-full p-1 bg-white border border-emerald-200 rounded text-[10px] focus:ring-1 focus:ring-emerald-500 outline-none"
                                                                placeholder="Ej: mi.alias.mp"
                                                            />
                                                        </div>

                                                        {/* INPUT: TELÉFONO */}
                                                        <div className="bg-zinc-50 p-2 rounded border border-zinc-200 mt-2">
                                                            <label className="text-[9px] font-bold text-zinc-600 uppercase block mb-1">
                                                                Teléfono (Trabajador)
                                                            </label>
                                                            <input 
                                                                value={item.telefono || ''} 
                                                                onChange={(e) => updateArrayItem('equipo', i, 'telefono', e.target.value)} 
                                                                className="w-full p-1 bg-white border border-zinc-300 rounded text-[10px] focus:ring-1 focus:ring-zinc-500 outline-none"
                                                                placeholder="Ej: +549112345678"
                                                            />
                                                        </div>

                                                        {/* INPUT: INSTAGRAM */}
                                                        <div className="bg-pink-50 p-2 rounded border border-pink-100 mt-2">
                                                            <label className="text-[9px] font-bold text-pink-800 uppercase block mb-1">
                                                                Instagram (Opcional)
                                                            </label>
                                                            <input 
                                                                value={item.instagram || ''} 
                                                                onChange={(e) => updateArrayItem('equipo', i, 'instagram', e.target.value)} 
                                                                className="w-full p-1 bg-white border border-pink-200 rounded text-[10px] focus:ring-1 focus:ring-pink-500 outline-none"
                                                                placeholder="Ej: @usuario"
                                                            />
                                                        </div>
                                                        <div className="bg-amber-50 p-2 rounded border border-amber-100 mt-2">
                                                            <div className="flex items-center justify-between">
                                                                <label className="text-[9px] font-bold text-amber-800 uppercase flex items-center gap-1 cursor-pointer">
                                                                    ¿Atiende a más de uno a la vez?
                                                                </label>
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={item.allowSimultaneous || false}
                                                                    onChange={(e) => {
                                                                        const isChecked = e.target.checked;
                                                                        updateArrayItem('equipo', i, 'allowSimultaneous', isChecked);
                                                                        if (isChecked && (!item.simultaneousCapacity || item.simultaneousCapacity < 2)) {
                                                                            updateArrayItem('equipo', i, 'simultaneousCapacity', 2);
                                                                        }
                                                                    }}
                                                                    className="w-3 h-3 accent-amber-600 rounded cursor-pointer"
                                                                />
                                                            </div>
                                                            
                                                            {item.allowSimultaneous && (
                                                                <div className="mt-2 animate-in fade-in slide-in-from-top-1 border-t border-amber-200/50 pt-2">
                                                                    <label className="text-[9px] font-bold text-amber-800 uppercase block mb-1">
                                                                        Capacidad máxima
                                                                    </label>
                                                                    <div className="flex items-center gap-2">
                                                                        <input 
                                                                            type="number" 
                                                                            min="2"
                                                                            value={item.simultaneousCapacity || 2} 
                                                                            onChange={(e) => updateArrayItem('equipo', i, 'simultaneousCapacity', parseInt(e.target.value) || 2)} 
                                                                            className="w-full p-1 bg-white border border-amber-200 rounded text-[10px] focus:ring-1 focus:ring-amber-500 outline-none"
                                                                        />
                                                                        <span className="text-[9px] text-amber-700 font-medium">personas</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="mt-2">
                                                            <ImageUpload label="Foto" value={item.imagenUrl} onChange={(url) => updateArrayItem('equipo', i, 'imagenUrl', url)} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <button 
                                        onClick={() => {
                                            const newItem = { id: Math.random().toString(36).substr(2, 9), nombre: "Nuevo Miembro", cargo: "Profesional", calendarId: "" };
                                            const newItems = [...(config.equipo.items || []), newItem];
                                            updateConfigField('equipo', 'items', newItems);
                                        }}
                                        className="w-full py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 font-bold text-sm hover:border-blue-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        <PlusCircle size={18}/> Agregar Miembro
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                    {/* 6. CONFIGURACIÓN DE VALORACIONES */}
                    if (sectionId === 'testimonios') return (
                        <div key="testimonios" ref={sectionsRefs.testimonios} className={getSectionClass('testimonios')}>
                            <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                                <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span> Sección Valoración
                                </h3>
                            </div>
                            
                            {config.testimonios?.mostrar && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div>
                                        <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Título de la invitación</label>
                                        <input 
                                            type="text" 
                                            value={config.testimonios?.titulo || "Tu opinión nos importa"} 
                                            onChange={(e) => updateConfigField('testimonios', 'titulo', e.target.value)} 
                                            className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-yellow-400 outline-none"
                                            placeholder="Ej: ¿Cómo fue tu experiencia?"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                    if (sectionId === 'ubicacion') return (
                        <div key="ubicacion" className={getSectionClass('ubicacion')}>
                            <SectionHeader title="Mapa y Ubicación" icon={<MapPin size={14} className="text-red-500"/>} toggleSection="ubicacion" toggleField="mostrar" />
                            {config.ubicacion?.mostrar && (
                                <div className="text-xs text-zinc-500 bg-zinc-50 p-3 rounded border">
                                    Esta sección muestra el mapa y los datos de contacto. 
                                    <br/><span className="italic">Edita la dirección en el bloque "Información de Contacto" arriba.</span>
                                </div>
                            )}
                        </div>
                    );
                
                {/* --- EDITORES DE SECCIONES DINÁMICAS --- */}
                const customSection = config.customSections?.find((s:any) => s.id === sectionId);
                if (customSection) {
                    return customSection && (
                        <div key={sectionId} id={`section-editor-${sectionId}`} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4 relative group">
                    
                            {/* Cabecera de la Sección */}
                            <div className="flex justify-between items-center pb-3 border-b border-zinc-100">
                                <h3 className="font-bold text-zinc-800 text-sm uppercase tracking-wide flex items-center gap-2">
                                    {customSection.type === 'about' ? <FileText size={16} className="text-blue-500"/> : <Image size={16} className="text-purple-500"/>}
                                    {customSection.type === 'about' ? 'Quiénes Somos' : 'Galería'}
                                </h3>
                                <div className="flex items-center gap-1">
                            
                                    <button onClick={() => removeSection(sectionId)} className="ml-2 text-red-300 hover:text-red-500"><Trash2 size={16}/></button>
                                </div>
                            </div>


                            {/* Editor: Quiénes Somos */}
                            {customSection.type === 'about' && (
                                <div className="space-y-3">
                                <div>
                                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Título</label>
                                    <input 
                                        value={customSection.titulo} 
                                        onChange={(e) => updateCustomSection(customSection.id, 'titulo', e.target.value)}
                                        className="w-full p-2 border border-zinc-200 rounded-lg text-sm"
                                />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold text-zinc-400 uppercase mb-1 block">Descripción</label>
                                    <textarea 
                                        rows={4}
                                        value={customSection.texto} 
                                        onChange={(e) => updateCustomSection(customSection.id, 'texto', e.target.value)}
                                        className="w-full p-2 border border-zinc-200 rounded-lg text-sm"
                                    />
                                </div>
                                <ImageUpload 
                                    label="Imagen (Opcional)" 
                                    value={customSection.imagenUrl} 
                                    onChange={(url) => updateCustomSection(customSection.id, 'imagenUrl', url)} 
                                />
                            </div>
                        )}

                        {/* Editor: Galería */}
                        {customSection.type === 'gallery' && (
                            <div className="space-y-3">
                                <input 
                                    value={customSection.titulo} 
                                    onChange={(e) => updateCustomSection(customSection.id, 'titulo', e.target.value)}
                                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm font-bold mb-2"
                                    placeholder="Título de la galería"
                                />

                                {/* --- NUEVO: SELECTOR DE PESTAÑAS --- */}
                                <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
                                    <button 
                                        onClick={() => setGalleryTab("upload")}
                                        className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${galleryTab === "upload" ? "bg-white shadow text-indigo-600" : "text-zinc-500"}`}
                                    >
                                        Subir Foto
                                    </button>
                                    <button 
                                        onClick={() => setGalleryTab("manage")}
                                        className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all ${galleryTab === "manage" ? "bg-white shadow text-indigo-600" : "text-zinc-500"}`}
                                    >
                                        Gestionar ({customSection.imagenes?.length || 0})
                                    </button>
                                </div>

                                {/* --- CONTENIDO DINÁMICO --- */}
                                {galleryTab === "upload" ? (
                                    <div className="pt-2 animate-in fade-in duration-200">
                                        <ImageUpload 
                                            label="Agregar Imagen a la Galería" 
                                            value="" 
                                            onChange={(url) => {
                                                const newImages = [...(customSection.imagenes || []), { url, descripcion: "" }];
                                                updateCustomSection(customSection.id, 'imagenes', newImages);
                                                setGalleryTab("manage"); // Te lleva a ver la foto recién subida
                                            }} 
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 animate-in fade-in duration-200">
                                        {customSection.imagenes?.length > 0 ? (
                                            customSection.imagenes.map((img: any, i: number) => (
                                                <div key={i} className="flex gap-2 items-center bg-zinc-50 p-2 rounded-lg border border-zinc-200">
                                                    <img src={img.url} className="w-10 h-10 rounded object-cover bg-zinc-200 shrink-0" />
                                                    <input 
                                                        value={img.descripcion || ''} 
                                                        onChange={(e) => {
                                                            const newImages = [...customSection.imagenes];
                                                            newImages[i].descripcion = e.target.value;
                                                            updateCustomSection(customSection.id, 'imagenes', newImages);
                                                        }}
                                                        className="flex-1 p-1 bg-transparent text-[11px] border-b border-transparent focus:border-zinc-300 outline-none truncate"
                                                        placeholder="Descripción..."
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            const newImages = customSection.imagenes.filter((_:any, idx:number) => idx !== i);
                                                            updateCustomSection(customSection.id, 'imagenes', newImages);
                                                        }}
                                                        className="text-zinc-400 hover:text-red-500"
                                                    >
                                                        <X size={14}/>
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center py-4 text-[11px] text-zinc-400 italic">No hay fotos subidas.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
                }
                return null;
            })}
        </div>

        {/* BOTONES DE ACCIÓN FIJOS (BOTTOM RIGHT) */}
        <div className="fixed bottom-0 right-0 w-[400px] p-5 border-t border-zinc-200 bg-white/95 backdrop-blur-sm flex gap-3 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
            <button
                onClick={() => { if (onSave) onSave(); onClose(); }}
                className="px-6 py-3 text-zinc-600 font-bold hover:bg-zinc-100 rounded-xl text-sm transition-colors"
            >
                Cerrar
            </button>
            <button
                onClick={handleSave}
                disabled={saving || saved}
                className={`flex-1 py-3 active:scale-[0.98] transition-all text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-md ${saved ? 'bg-green-600 hover:bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
                {saving ? <><Loader2 size={18} className="animate-spin"/> Guardando...</> : saved ? <><Check size={18}/> ¡Guardado!</> : <><Save size={18}/> Guardar</>}
            </button>
        </div>
      </div>
    </div>
    </div>
  );
}