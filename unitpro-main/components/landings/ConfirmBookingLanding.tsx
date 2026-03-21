"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { useSearchParams } from "next/navigation"; 
import { Phone, CheckCircle, X, Star, MessageCircle, ArrowRight, ShieldCheck, Loader2, ChevronRight, Heart, MapPin, Clock, Calendar as CalendarIcon, User, Mail, Menu, Maximize2, ChevronLeft, Instagram, Facebook, Linkedin, Users, Globe, Tag } from "lucide-react";

import { SafeHTML } from "@/components/ui/SafeHTML";
import { Footer } from "@/components/blocks/Footer";
import InlineAlert from "@/components/ui/InlineAlert";
import type { WebConfig } from "@/types/web-config";
import { checkAvailability } from "@/app/actions/confirm-booking/check-availability";
import { createAppointment } from "@/app/actions/confirm-booking/manage-appointment";
import { getLocalDateString, isDayClosed } from "@/lib/time-slots";
import { formatDuration } from "@/lib/format-duration";

export default function LandingCliente({ initialData }: { initialData: any }) {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const isEditorMode = searchParams.get('editor') === 'true';

  const [negocio, setNegocio] = useState<any>(initialData);
  const [eventLink, setEventLink] = useState(""); 
  
  // --- MODALES ---
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); // Estado para menú móvil
  const [uploadingImages, setUploadingImages] = useState(false)

  // --- ESTADO WIZARD (AGENDAMIENTO) ---
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingData, setBookingData] = useState<{
  services: any[];
  date: string;
  time: string;
  worker: any | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  message: string;
  images: string[];
  clientAreaCode: string;
  clientLocalNumber: string;
}>({
  services: [],
  date: "",
  time: "",
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  message: "",
  images: [],
  worker: null,
  clientAreaCode: "",
  clientLocalNumber: "",
});
  const [busySlots, setBusySlots] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [dateError, setDateError] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [showGoogleReviewPrompt, setShowGoogleReviewPrompt] = useState(false);

  // --- DERIVADOS MULTI-SERVICIO ---
  const svcKey = (s: any) => s.id || s.titulo || s.name;
  const totalDuration = bookingData.services.reduce((acc, s) => acc + (s.duracion || s.duration || 60), 0) || 60;
  const totalPrice    = bookingData.services.reduce((acc, s) => acc + Number(s.precio || s.price || 0), 0);
  const serviceNames  = bookingData.services.map(s => s.titulo || s.name).join(" + ") || "Servicio Agendado";

  const toggleService = (item: any) => {
    setBookingData(prev => {
      const exists = prev.services.some(s => svcKey(s) === svcKey(item));
      return {
        ...prev,
        services: exists ? prev.services.filter(s => svcKey(s) !== svcKey(item)) : [...prev.services, item],
        time: "",
      };
    });
  };

  // --- ESTADOS GENERALES ---
  const [nombreCliente, setNombreCliente] = useState("");
  const [feedbackComentario, setFeedbackComentario] = useState("");
  const [ratingSeleccionado, setRatingSeleccionado] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [mostrarGracias, setMostrarGracias] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollPrev = () => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const scrollNext = () => {
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  const galleryScrollRef = useRef<HTMLDivElement>(null);

  const scrollGalleryPrev = () => {
    if (galleryScrollRef.current) {
        galleryScrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollGalleryNext = () => {
    if (galleryScrollRef.current) {
        galleryScrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };
  
  // Mostrar valoraciones
  useEffect(() => {
    const fetchReviews = async () => {
        if (!negocio?.id) return;
        const { data } = await supabase
            .from('resenas')
            .select('*')
            .eq('negocio_id', negocio.id)
            .eq('visible', true) // <--- AGREGAR ESTA LÍNEA
            .order('created_at', { ascending: false });
        
        if (data) setReviews(data);
    };
    fetchReviews();
  }, [negocio?.id]);
  
  useEffect(() => {
    const fetchAvailability = async () => {
        if (bookingData.date && negocio.slug) {
            // --- LOG TEMPORAL ---
            console.log("Frontend pidiendo disponibilidad:", {
                fecha: bookingData.date,
                workerID: bookingData.worker?.id, // <--- ESTO NO DEBE SER UNDEFINED
                workerNombre: bookingData.worker?.nombre
            });
            // --------------------

            setLoadingSlots(true);
            try {
                const res = await checkAvailability(negocio.slug, bookingData.date, bookingData.worker?.id);
                if (res.success && res.busy) {
                    setBusySlots(res.busy);
                } else {
                    setBusySlots([]);
                }
            } catch (error) {
                console.error("Error buscando disponibilidad:", error);
            } finally {
                setLoadingSlots(false);
            }
        }
    };

    fetchAvailability();
  }, [bookingData.date, bookingData.worker, negocio.slug]);

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

  // --- LÓGICA DE HORARIOS ---
  const getBusinessHours = () => {
    if (!negocio.horarios) return { start: 9, end: 18 }; 
    try {
        const times = negocio.horarios.match(/(\d{2}):(\d{2})/g);
        if (times && times.length >= 2) {
            const startHour = parseInt(times[0].split(':')[0]);
            const endHour = parseInt(times[1].split(':')[0]);
            return { start: startHour, end: endHour };
        }
    } catch(e) {}
    return { start: 9, end: 18 }; 
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (!dateStr) return;
    setDateError("");

    // Validar que no sea fecha pasada
    if (dateStr < getLocalDateString()) {
      setDateError("No podés seleccionar una fecha pasada.");
      setBookingData(prev => ({ ...prev, date: "", time: "" }));
      setBusySlots([]);
      return;
    }

    const schedule = negocio.config_web?.schedule;
    if (schedule && isDayClosed(dateStr, schedule)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dias = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
      const dayIndex = new Date(y, m - 1, d).getDay();
      setDateError(`El negocio permanece cerrado los ${dias[dayIndex]}. Por favor elegí otra fecha.`);
      setBookingData(prev => ({ ...prev, date: "", time: "" }));
      setBusySlots([]);
      return;
    }

    const promoSvc = bookingData.services.find((s: any) => s.isPromo && s.promoEndDate);
    if (promoSvc) {
      const selectedDate = new Date(`${dateStr}T00:00:00`);
      const limitDate = new Date(`${promoSvc.promoEndDate}T23:59:59`);
      if (selectedDate > limitDate) {
        setDateError(`Esta promoción solo es válida hasta el ${limitDate.toLocaleDateString('es-AR')}.`);
        setBookingData(prev => ({ ...prev, date: "", time: "" }));
        setBusySlots([]);
        return;
      }
    }

    setBookingData(prev => ({ ...prev, date: dateStr, time: "" }));
    setBusySlots([]);
  };

  const generateTimeSlots = () => {
    // 1. Obtener fecha y día de la semana de forma segura
    if (!bookingData.date) return [];

    let schedule = negocio.config_web?.schedule || {};

    if (negocio.config_web?.equipo?.scheduleType === 'per_worker' && bookingData.worker?.schedule) {
        schedule = bookingData.worker.schedule;
    }
    
    const [year, month, day] = bookingData.date.split('-').map(Number);
    // Creamos la fecha localmente para obtener el día correcto (0-6)
    const dateObj = new Date(year, month - 1, day); 
    const dayOfWeek = String(dateObj.getDay()); // "0" = Domingo, "1" = Lunes...

    // 2. Obtener configuración del día
    const dayConfig = schedule[dayOfWeek];

    // Variables para definir apertura y cierre
    if (!dayConfig || !dayConfig.isOpen) return [];

    // 3. Normalizar Rangos (Soporte para estructura vieja y nueva)
    let ranges = [];
    
    if (dayConfig.ranges && Array.isArray(dayConfig.ranges)) {
        // Nueva estructura: Array de rangos
        ranges = dayConfig.ranges;
    } else if (dayConfig.start && dayConfig.end) {
        // Vieja estructura: Un solo rango (retrocompatibilidad)
        ranges = [{ start: dayConfig.start, end: dayConfig.end }];
    } else {
        // Fallback por defecto
        ranges = [{ start: "09:00", end: "18:00" }];
    }

    const slots = [];
    const serviceDuration = totalDuration;

    const INTERVAL_STEP = 30;

    // 4. Iterar por CADA rango configurado (Mañana, Tarde, etc.)
    for (const range of ranges) {
        const [startH, startM] = range.start.split(':').map(Number);
        const [endH, endM] = range.end.split(':').map(Number);

        // Convertir hora de cierre de este rango a Date para comparar
        const rangeClosingTime = new Date(`${bookingData.date}T${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00`);

        // Generar slots dentro de este rango específico
        // Iteramos hora por hora
        for (let hour = startH; hour <= endH; hour++) {
            for (let min = 0; min < 60; min += INTERVAL_STEP) {
                
                // Filtro inicio rango: Si es la hora de inicio, respetar minutos
                if (hour === startH && min < startM) continue;

                // Filtro fin rango: Si pasamos la hora fin, cortamos este rango
                if (hour > endH || (hour === endH && min >= endM)) break;

                const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                
                const slotStart = new Date(`${bookingData.date}T${timeString}:00`);
                const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000);

                // Validar que el servicio termine ANTES de que cierre este turno
                if (slotEnd > rangeClosingTime) continue;

                // 5. Verificar colisión con Google Calendar (BusySlots)
                let overlappingCount = 0;
                
                // A. Primero contamos CUÁNTOS turnos reales pisan este horario
                for (const busy of busySlots) {
                    const busyStart = new Date(busy.start);
                    const busyEnd = new Date(busy.end);
                    
                    // Comprobamos matemáticamente si los horarios se cruzan
                    if (slotStart < busyEnd && slotEnd > busyStart) {
                        overlappingCount++; // <--- Esto es lo que faltaba, sumar el contador
                    }
                }
                
                // B. Luego, determinamos la capacidad según la configuración
                let capacity = 1; // Por defecto siempre es 1
                const availabilityMode = negocio.config_web?.equipo?.availabilityMode || 'global';
                
                // Verificamos de forma segura si el modo NO es global
                const isGlobal = availabilityMode === 'global' || availabilityMode === 'sala_unica';
                
                // Verificamos si el profesional permite simultáneos
                const permiteSimultaneo = bookingData.worker?.allowSimultaneous === true || String(bookingData.worker?.allowSimultaneous) === 'true';
                
                // Si no es sala única y el profesional lo permite, le damos su capacidad real
                if (!isGlobal && permiteSimultaneo) {
                    capacity = Number(bookingData.worker?.simultaneousCapacity) || 2;
                }
                
                // C. Finalmente, si los ocupados son MENOS que la capacidad, mostramos el horario UNA SOLA VEZ
                if (overlappingCount < capacity) {
                    slots.push({ time: timeString, available: true });
                }
            }
        }
    }
    
    // Ordenar slots por hora (por si los rangos estuvieran desordenados en el JSON)
    return slots.sort((a, b) => a.time.localeCompare(b.time));
};

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    
    const slotStart = new Date(`${bookingData.date}T${bookingData.time}:00`);
    const slotEnd = new Date(slotStart.getTime() + totalDuration * 60000);

    const serviceName = serviceNames;

    const numeroArmado = `+549${bookingData.clientAreaCode}${bookingData.clientLocalNumber}`;

    const payload = {
        service: serviceName, 
        precio: totalPrice,
        date: bookingData.date,
        time: bookingData.time,
        clientName: bookingData.clientName,
        clientPhone: numeroArmado,
        clientEmail: bookingData.clientEmail,
        start: slotStart.toISOString(),
        end: slotEnd.toISOString(),
        calendarId: bookingData.worker?.calendarId, 
        workerName: bookingData.worker?.nombre,
        workerId: bookingData.worker?.id,
        message: bookingData.message, 
        images: bookingData.images,
    };
    
    const res = await createAppointment(negocio.slug, payload);
    
    setEnviando(false);
    if (res.success) {
        setIsBookingModalOpen(false);
        if ((res as any).eventLink) setEventLink((res as any).eventLink); 
        setMostrarGracias(true);
        setBookingStep(1);
        setBookingData({ services: [], date: "", time: "", clientName: "", clientPhone: "", clientEmail: "", worker: null, message: "", images: [], clientAreaCode: "", clientLocalNumber: "" });
    } else {
        setBookingError(res.error || "Error al confirmar la reserva.");
    }
  };

  // --- LÓGICA FEEDBACK / LEAD ---
  const handleEnviarFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ratingSeleccionado === 0) { setFeedbackError("Por favor, selecciona una puntuación."); return; }
    setEnviando(true);

    // 1. Guardamos SIEMPRE en tu base de datos (para tu control interno)
    const { error } = await supabase.from("resenas").insert([{
        negocio_id: negocio.id,
        puntuacion: ratingSeleccionado,
        comentario: feedbackComentario,
        nombre_cliente: nombreCliente || "Anónimo"
    }]);

    setEnviando(false);
    
    if (!error) {
        setIsFeedbackModalOpen(false);
        setFeedbackComentario("");
        setRatingSeleccionado(0);
        setNombreCliente("");

        if (ratingSeleccionado >= 4 && negocio.google_maps_link) {
            setShowGoogleReviewPrompt(true);
        }
    } else {
        setFeedbackError("Hubo un error al guardar. Intenta nuevamente.");
    }
  };

  const handleConsultar = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setEnviando(true);
    await supabase.from("leads").insert([{ negocio_id: negocio.id, nombre_cliente: nombreCliente, telefono_cliente: "No especificado", estado: "nuevo" }]);
    window.open(`https://wa.me/${negocio.whatsapp}?text=${encodeURIComponent(`Hola, soy ${nombreCliente}, consulta...`)}`, '_blank');
    setEnviando(false); setIsLeadModalOpen(false); setNombreCliente("");
  };

  // --- UX HELPERS ---
  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // --- CONFIG VISUAL ---
  const handleEditClick = (e: React.MouseEvent, sectionName: string) => {
    if (!isEditorMode) return; 
    e.preventDefault(); e.stopPropagation();
    window.parent.postMessage({ type: "FOCUS_SECTION", section: sectionName }, "*");
  };
  
  const editableClass = isEditorMode ? "cursor-pointer hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 transition-all duration-200 rounded-lg relative z-50" : "";
  const rawConfig = negocio?.config_web || {};
  const appearance = rawConfig.appearance || { font: 'sans', radius: 'medium' };
  
  // Tailwind dinámico
  const fontClass = { 'sans': 'font-sans', 'serif': 'font-serif', 'mono': 'font-mono' }[appearance.font as string] || 'font-sans';
  const radiusClass = { 'none': 'rounded-none', 'medium': 'rounded-2xl', 'full': 'rounded-[2.5rem]' }[appearance.radius as string] || 'rounded-2xl';
  const btnRadius = { 'none': 'rounded-none', 'medium': 'rounded-xl', 'full': 'rounded-full' }[appearance.radius as string] || 'rounded-xl';
  const cardRadius = { 'none': 'rounded-none', 'medium': 'rounded-2xl', 'full': 'rounded-[2.5rem]' }[appearance.radius as string] || 'rounded-2xl';
  const buttonRadius = { 'none': 'rounded-none', 'medium': 'rounded-xl', 'full': 'rounded-full' }[appearance.radius as string] || 'rounded-xl';
  const config: WebConfig = {
    logoUrl: rawConfig.logoUrl || negocio.logo_url,
    template: rawConfig.template || "modern",
    colors: { primary: negocio?.color_principal || "#000000", ...rawConfig.colors },
    hero: { mostrar: true, layout: 'split', ...rawConfig.hero },
    servicios: { mostrar: true, titulo: "Nuestros Servicios", items: [], ...rawConfig.servicios },
    equipo: { mostrar: false, items: [], ...rawConfig.equipo },
    testimonios: { mostrar: rawConfig.testimonios?.mostrar ?? false, titulo: "Opiniones", items: [] },
    ubicacion: { mostrar: true, ...rawConfig.ubicacion },
    footer: { mostrar: true, textoCopyright: rawConfig.footer?.textoCopyright,
        redesSociales: {
            instagram: negocio.instagram, 
            facebook: negocio.facebook,   
            linkedin: negocio.linkedin,  
            whatsapp: negocio.whatsapp}, ...rawConfig.footer },
    customSections: rawConfig.customSections || [],
    sectionOrder: rawConfig.sectionOrder,
    booking: rawConfig.booking
  };

  const defaultOrder = [
      'hero', 
      'servicios', 
      ...(config.customSections?.map((s:any) => s.id) || []), 
      'testimonios',
      'ubicacion'
  ];

  // Este es el array final que usaremos para pintar
  const activeOrder = config.sectionOrder && config.sectionOrder.length > 0 
      ? config.sectionOrder 
      : defaultOrder;
  
  const brandColor = config.colors.primary;
  const secondaryColor = config.colors.secondary || "#ffffff"; // Color de Fondo
  const textColor = config.colors.text || "#1f2937";
  const heroImage = config.hero.imagenUrl || negocio.imagen_url || "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200";
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  
  return (
    <div 
    className={`min-h-screen pb-0 overflow-x-hidden ${fontClass}`}
    style={{ backgroundColor: secondaryColor, color: textColor }}>
      
      {/* --- NAVBAR DE NAVEGACIÓN --- */}
      <nav className="fixed top-0 left-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-zinc-100 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
            
            {/* Logo o Nombre (Izquierda) */}
            <div onClick={(e) => handleEditClick(e, 'identity')} className={`cursor-pointer ${editableClass}`}>
                {config.logoUrl ? (
                    <img src={config.logoUrl} alt="Logo" className="h-10 object-contain" />
                ) : (
                    <span className="text-xl font-bold tracking-tight text-zinc-900">{negocio.nombre}</span>
                )}
            </div>

            {/* Menú Desktop */}
            <div className="hidden lg:flex items-center gap-8">
                <button onClick={() => scrollToSection('inicio')} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Inicio</button>
                {config.servicios?.mostrar && (
                <button onClick={() => scrollToSection('servicios')} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Servicios</button>
                )}
                {config.ubicacion?.mostrar && (
                <button onClick={() => scrollToSection('ubicacion')} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Dónde estamos</button>
                )}
                <button onClick={() => scrollToSection('contacto')} className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors">Contacto</button>
                
                <button 
                    onClick={() => setIsBookingModalOpen(true)} 
                    className={`px-5 py-2.5 text-white font-bold text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all ${btnRadius}`}
                    style={{ backgroundColor: brandColor }}
                >
                    Reservar Turno
                </button>
            </div>

            {/* Menú Móvil Toggle */}
            <button className="lg:hidden p-2 text-zinc-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X/> : <Menu/>}
            </button>
        </div>

        {/* Menú Móvil Dropdown */}
        {mobileMenuOpen && (
            <div className="lg:hidden bg-white border-t border-zinc-100 p-6 flex flex-col gap-4 shadow-xl">
                <button onClick={() => scrollToSection('inicio')} className="text-left font-medium text-zinc-600 py-2">Inicio</button>
                {config.servicios?.mostrar && (
                <button onClick={() => scrollToSection('servicios')} className="text-left font-medium text-zinc-600 py-2">Servicios</button>
                )}
                {config.ubicacion?.mostrar && (
                <button onClick={() => scrollToSection('ubicacion')} className="text-left font-medium text-zinc-600 py-2">Dónde estamos</button>
                )}
                <button onClick={() => scrollToSection('contacto')} className="text-left font-medium text-zinc-600 py-2">Contacto</button>
                <button onClick={() => {setIsBookingModalOpen(true); setMobileMenuOpen(false)}} className="w-full bg-zinc-900 text-white font-bold py-3 rounded-xl mt-2">Reservar Turno</button>
            </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <header id="inicio" className="relative w-full min-h-[100svh] flex flex-col items-center justify-center overflow-hidden py-28" onClick={(e) => handleEditClick(e, 'hero')}>
         
         {/* Fondo con Overlay */}
         <div className="absolute inset-0 w-full h-full z-0">
            <img src={heroImage} className="w-full h-full object-cover" alt="Fondo"/>
            <div className="absolute inset-0 bg-black transition-all duration-300" style={{ opacity: (config.hero.overlayOpacity || 50) / 100 }}></div>
         </div>

         {/* Contenido Central */}
         <div className={`relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center justify-center pt-8 ${editableClass}`}>
            
            {/* Logo en el Hero ajustado para que no rompa en mobile */}
            {config.logoUrl && (
                <div className="w-44 h-44 sm:w-48 sm:h-48 md:w-52 md:h-52 flex items-center justify-center mb-14 md:mb-16 transform hover:scale-105 transition-transform duration-500">
                    <img src={config.logoUrl} alt="Logo Hero" className="w-full h-full object-contain drop-shadow-[0_4px_16px_rgba(0,0,0,0.4)]"/>
                </div>
            )}

            {/* Contenedor Refinado con Glassmorphism fuerte (Le sacamos los márgenes top gigantes) */}
            <div className="bg-white/15 backdrop-blur-xl border border-white/20 p-6 md:p-8 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-in zoom-in-95 fade-in duration-700 w-full max-w-xl">
                <SafeHTML as="h1" html={config.hero.titulo} className="text-3xl lg:text-[3.5rem] font-extrabold tracking-tight text-white mb-4 drop-shadow-md leading-tight" />
                
                {/* Botones accesibles con mayor Target Area (min-h-[48px]) */}
                <div className="flex flex-col lg:flex-row items-center justify-center gap-4">
                    <button 
                        onClick={() => setIsBookingModalOpen(true)} 
                        className={`w-full sm:w-auto px-8 py-3.5 min-h-[48px] text-white font-bold text-base shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 ${btnRadius}`} 
                        style={{ backgroundColor: brandColor }}
                    >
                        <CalendarIcon size={20}/> {config.hero.ctaTexto || "Reservar Turno"}
                    </button>
                    <button onClick={() => scrollToSection('servicios')} className={`w-full sm:w-auto text-white hover:bg-white/10 hover:text-white border border-transparent hover:border-white/30 font-semibold px-8 py-3.5 min-h-[48px] transition-all duration-300 ${btnRadius}`}>
                        Ver Servicios
                    </button>
                </div>
            </div>
         </div>
      </header>

      {/* --- SERVICIOS --- */}
      {config.servicios?.mostrar && (
          // Quitamos bg-zinc-50 para que se vea tu color de fondo secundario
          <section id="servicios" className="py-24 px-6" onClick={(e) => handleEditClick(e, 'servicios')}>
            <div className={`max-w-7xl mx-auto ${editableClass}`}>
                {config.servicios?.titulo && (
                    <div className="text-center mb-16">
                        <span className="text-sm font-bold uppercase tracking-wider opacity-60">Lo que hacemos</span>
                        {/* Usamos 'inherit' en el color para respetar tu configuración */}
                        <h2 className="text-3xl md:text-4xl font-bold mt-2" style={{ color: textColor }}>{config.servicios.titulo}</h2>
                        <div className="w-20 h-1.5 mt-4 mx-auto rounded-full" style={{ backgroundColor: brandColor }}></div>
                    </div>
                )}
                
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Combinamos servicios normales y promociones */}
                    {[...(config.servicios?.items || []), ...(negocio.config_web?.services || [])].map((service: any, i: number) => {
                        
                        // LÓGICA DE PROMOCIÓN
                        let isPromo = service.isPromo && service.promoEndDate;

                        // Si la promo expiró (sumamos T23:59:59 para evitar bugs de zona horaria), vuelve a ser un servicio normal
                        if (isPromo && new Date(service.promoEndDate + 'T23:59:59') < new Date()) {
                            isPromo = false; 
                        }

                        // Normalizamos nombres de campos
                        const titulo = service.name || service.titulo;
                        const precio = service.price || service.precio;
                        const desc = service.description || service.desc;
                        const duracion = service.duration || service.duracion || 60;
                        const imagenUrl = service.image || service.imagenUrl; // Soporte para ambos campos

                        // Si la promo expiró, no la mostramos
                        

                        return (
                            <div 
                                key={service.id || i} 
                                className={`
                                    relative p-8 transition-all duration-300 group cursor-pointer overflow-hidden
                                    ${radiusClass}
                                    ${isPromo 
                                        ? 'bg-gradient-to-br from-pink-50 to-white border-2 border-pink-200 shadow-lg shadow-pink-100 transform hover:-translate-y-2' 
                                        : 'border border-zinc-500/10 shadow-sm hover:shadow-xl hover:-translate-y-2'
                                    }
                                `}
                                style={{ backgroundColor: isPromo ? undefined : 'rgba(255,255,255,0.05)' }}
                                onClick={() => {
                                    // VOLVEMOS A GUARDAR EL OBJETO COMPLETO
                                    // Esto es necesario para saber la duración y el precio después
                                    setBookingData(prev => ({ ...prev, service: service }));
                                    
                                    setBookingStep(2); 
                                    setIsBookingModalOpen(true);
                                }}
                            >
                                {/* BADGE DE PROMOCIÓN (Absolute) */}
                                {isPromo && (
                                    <div className="absolute top-4 right-4 bg-pink-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm uppercase tracking-wider flex items-center gap-1 z-10">
                                        <Tag size={10} /> Oferta
                                    </div>
                                )}

                                {/* IMAGEN O ICONO */}
                                {imagenUrl ? (
                                    <div className="w-full h-48 mb-6 rounded-xl overflow-hidden shadow-md relative z-0">
                                        <img 
                                            src={imagenUrl} 
                                            alt={titulo} 
                                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-14 h-14 mb-6 text-white rounded-2xl flex items-center justify-center shadow-lg transform group-hover:-translate-y-2 transition-transform" style={{ backgroundColor: isPromo ? '#db2777' : brandColor }}>
                                        {isPromo ? <Tag size={28}/> : <CheckCircle size={28}/>}
                                    </div>
                                )}

                                {/* CONTENIDO TEXTO */}
                                <h3 className={`font-bold text-xl mb-3 ${isPromo ? 'text-pink-900' : ''}`} style={{ color: isPromo ? undefined : textColor }}>
                                    {titulo}
                                </h3>
                                
                                {precio != null && precio !== "" && Number(precio) !== 0 && (
                                    <p className={`leading-relaxed opacity-70 mb-4 font-medium ${isPromo ? 'text-pink-800' : ''}`}>
                                        {typeof precio === 'number' || !isNaN(Number(precio)) ? `$${precio}` : precio}
                                    </p>
                                )}

                                {/* INFO DE VENCIMIENTO SI ES PROMO */}
                                {isPromo && (
                                    <div className="mb-4 text-xs font-bold text-pink-600 bg-pink-100/50 p-2 rounded-lg text-center border border-pink-100">
                                        🔥 Válido hasta el {new Date(service.promoEndDate).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                    </div>
                                )}

                                <div className="flex flex-row items-center gap-2 text-xs font-bold text-zinc-400 mb-2">
                                    <Clock size={12} />
                                    <span>{formatDuration(duracion)}</span>
                                </div>
                                
                                <p className="leading-relaxed opacity-70 text-sm line-clamp-3">
                                    {desc}
                                </p>

                                {/* BOTÓN DE ACCIÓN */}
                                <div className={`mt-6 w-full py-2 rounded-lg text-center text-sm font-bold transition-colors ${isPromo ? 'bg-pink-600 text-white group-hover:bg-pink-700' : 'bg-zinc-100 text-zinc-600 group-hover:bg-zinc-900 group-hover:text-white'}`}>
                                    Reservar Turno
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
          </section>
      )}

      {/* --- SECCIONES DINÁMICAS (Nuevo Bloque) --- */}
      {config.customSections?.map((section: any) => (
        <section key={section.id} className="py-20 px-6 max-w-7xl mx-auto">
            
            {/* Si es QUIENES SOMOS */}
            {section.type === 'about' && (
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className={section.imagenUrl ? 'order-1' : ''}>
                        <h2 className="text-3xl font-bold mb-6" style={{ color: textColor }}>{section.titulo}</h2>
                        <SafeHTML as="div" html={section.texto} className="text-lg opacity-80 leading-relaxed whitespace-pre-line" style={{ color: textColor }} />
                    </div>
                    {section.imagenUrl && (
                        <div className={`overflow-hidden shadow-xl h-[400px] ${cardRadius}`}>
                            <img src={section.imagenUrl} alt={section.titulo} className="w-full h-full object-cover"/>
                        </div>
                    )}
                </div>
            )}

            {/* Si es GALERÍA */}
            {/* Si es GALERÍA */}
            {section.type === 'gallery' && (
                <div>
                    <h2 className="text-3xl font-bold mb-12 text-center">{section.titulo}</h2>
                    <div className="relative">
                        
                        {/* Botón Izquierda */}
                        {section.imagenes?.length > 3 && (
                            <button 
                                onClick={scrollGalleryPrev}
                                className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-20 bg-white p-3 rounded-full shadow-lg border border-zinc-100 text-zinc-600 hover:text-indigo-600 hover:scale-110 transition-all"
                            >
                                <ChevronLeft size={24} />
                            </button>
                        )}

                        {/* Contenedor Scrollable */}
                        <div 
                            ref={galleryScrollRef}
                            className={`flex gap-4 overflow-x-auto pb-8 px-2 snap-x snap-mandatory ${section.imagenes?.length > 3 ? 'cursor-grab active:cursor-grabbing' : 'justify-center'}`}
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {section.imagenes?.map((img: any, i: number) => (
                                <div 
                                    key={i} 
                                    onClick={() => setSelectedImage(img.url)}
                                    className={`snap-center shrink-0 w-[70vw] md:w-[250px] lg:w-[300px] group relative aspect-square overflow-hidden bg-zinc-100 cursor-zoom-in ${cardRadius}`}
                                >
                                    <img src={img.url} alt={img.descripcion} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                                    
                                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                         <Maximize2 className="text-white drop-shadow-md" size={24} />
                                    </div>

                                    {img.descripcion && (
                                        <div className="absolute bottom-0 left-0 w-full bg-black/60 text-white p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                            {img.descripcion}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Botón Derecha */}
                        {section.imagenes?.length > 3 && (
                            <button 
                                onClick={scrollGalleryNext}
                                className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-20 bg-white p-3 rounded-full shadow-lg border border-zinc-100 text-zinc-600 hover:text-indigo-600 hover:scale-110 transition-all"
                            >
                                <ChevronRight size={24} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </section>
      ))}

      
      {/* --- NUEVA SECCIÓN: EQUIPO --- */}
      {config.equipo?.mostrar && (
        <section id="equipo" className="py-24 px-6 bg-zinc-50 border-t border-zinc-200">
            <div className="max-w-7xl mx-auto text-center mb-12">
                 <span className="text-sm font-bold uppercase tracking-wider opacity-60">Nuestro Equipo</span>
                 <h2 className="text-3xl font-bold mt-2 mb-4 text-zinc-900">{config.equipo.titulo}</h2>
                 {config.equipo.subtitulo && <p className="text-zinc-500 max-w-2xl mx-auto">{config.equipo.subtitulo}</p>}
            </div>
            <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-8">
                {config.equipo.items?.map((item: any, i: number) => (
                    <div key={i} className="w-full sm:w-[calc(50%-2rem)] md:w-[280px] flex flex-col items-center text-center p-6 bg-white rounded-2xl shadow-sm border border-zinc-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                        <div className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-zinc-100 border-2 border-white shadow-md">
                             {item.imagenUrl ? (
                                <img src={item.imagenUrl} className="w-full h-full object-cover" alt={item.nombre}/>
                             ) : (
                                <Users className="w-full h-full p-6 text-zinc-300"/>
                             )}
                        </div>
                        <h3 className="font-bold text-lg text-zinc-900">{item.nombre}</h3>
                        <p className="text-zinc-500 max-w-2xl mx-auto">{item.cargo}</p>
                        {item.instagram && (
                            <a 
                                href={`https://instagram.com/${item.instagram.replace('@', '').trim()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 inline-flex items-center gap-1.5 px-4 py-1.5 bg-pink-50 text-pink-600 rounded-full text-xs font-bold hover:bg-pink-100 hover:-translate-y-0.5 transition-all border border-pink-100"
                            >
                                <Instagram size={14} />
                                {/* Asegura que siempre se vea con el @ por más que en el panel lo escriban sin el @ */}
                                {item.instagram.startsWith('@') ? item.instagram : `@${item.instagram}`}
                            </a>
                        )}
                    </div>
                ))}
            </div>
        </section>
      )}
      {/* --- SECCIÓN FEEDBACK (SOLO BOTÓN) --- */}
      {/* --- SECCIÓN TESTIMONIOS/RESEÑAS --- */}
      {config.testimonios?.mostrar && (
      <section className="py-24 px-6 bg-zinc-50 border-y border-zinc-100">
          <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12 max-w-3xl mx-auto">
                <span className="text-sm font-bold uppercase tracking-wider opacity-60 block mb-2">Testimonios</span>
                <h2 className="text-3xl font-bold mb-4 text-zinc-900">
                    Lo que dicen nuestros clientes
                </h2>
                <p className="text-zinc-500 max-w-2xl mx-auto mb-8">
                    La confianza de nuestros clientes es nuestra mejor carta de presentación.
                </p>
                <button 
                    onClick={() => setIsFeedbackModalOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all text-sm"
                    style={{ backgroundColor: brandColor }}
                >
                    <Star size={18} className="fill-current"/> Dejar mi valoración
                </button>
              </div>

              {/* LISTA DE RESEÑAS CON CARRUSEL */}
              {reviews.length > 0 ? (
                <div className="relative">
                    
                    {/* Botón Izquierda (Solo si hay +3 reseñas) */}
                    {reviews.length > 3 && (
                        <button 
                            onClick={scrollPrev}
                            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-20 bg-white p-3 rounded-full shadow-lg border border-zinc-100 text-zinc-600 hover:text-indigo-600 hover:scale-110 transition-all"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}

                    {/* Contenedor Scrollable */}
                    <div 
                        ref={scrollContainerRef}
                        className={`flex gap-6 overflow-x-auto pb-8 px-6 snap-x snap-mandatory ${reviews.length > 3 ? 'cursor-grab active:cursor-grabbing' : 'md:justify-center'}`}
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Oculta la barra de scroll nativa
                    >
                        {reviews.map((review) => (
                            <div 
                                key={review.id} 
                                
                                className={`snap-start shrink-0 w-[85vw] md:w-[350px] lg:w-[400px] p-6 bg-white shadow-sm border border-zinc-100 flex flex-col ${cardRadius}`}
                            >
                                {/* Estrellas */}
                                <div className="flex gap-1 mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star 
                                            key={i} 
                                            size={16} 
                                            className={i < review.puntuacion ? "text-yellow-400 fill-yellow-400" : "text-zinc-200"} 
                                        />
                                    ))}
                                </div>
                                
                                {/* Comentario */}
                                <div className="flex-1">
                                    <p className="text-zinc-600 mb-6 italic text-sm leading-relaxed">"{review.comentario}"</p>
                                </div>

                                {/* Autor */}
                                <div className="flex items-center gap-3 pt-4 border-t border-zinc-50 mt-auto">
                                    <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-400 text-xs uppercase">
                                        {review.nombre_cliente?.charAt(0) || "A"}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-zinc-900">{review.nombre_cliente || "Anónimo"}</p>
                                        <p className="text-[10px] text-zinc-400 uppercase font-medium">{new Date(review.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* CAMBIO 3: Espaciador invisible para que la última tarjeta no quede pegada al borde en mobile */}
                        <div className="w-1 md:hidden shrink-0"></div>
                    </div>

                    {/* Botón Derecha (Solo si hay +3 reseñas) */}
                    {reviews.length > 3 && (
                        <button 
                            onClick={scrollNext}
                            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-20 bg-white p-3 rounded-full shadow-lg border border-zinc-100 text-zinc-600 hover:text-indigo-600 hover:scale-110 transition-all"
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}
                </div>
              ) : (
                <div className="text-center text-zinc-400 py-10 italic bg-white rounded-2xl border border-dashed border-zinc-200">
                    Aún no hay reseñas visibles. ¡Sé el primero en opinar!
                </div>
              )}
          </div>
      </section>
      )}
      

      {/* --- UBICACIÓN (NUEVA SECCIÓN) --- */}
      {config.ubicacion?.mostrar && (
        <section id="ubicacion" className="py-24 px-6 relative overflow-hidden" onClick={(e) => handleEditClick(e, 'contact')}>
            <div className={`max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center ${editableClass}`}>
                <div>
                    <span className="text-sm font-bold uppercase tracking-wider opacity-60">Dónde estamos</span>
                    <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6" style={{ color: textColor }}>Visítanos en nuestra sucursal</h2>
                    <p className="mb-8 text-lg opacity-70">Estamos listos para atenderte con la mejor calidad y servicio. Agenda tu cita o ven directamente.</p>
                    
                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: brandColor + '20', color: brandColor }}><MapPin size={20}/></div>
                            <div>
                                <h4 className="font-bold" style={{ color: textColor }}>Dirección</h4>
                                <p className="opacity-70">{negocio.direccion || "Dirección no configurada"}</p>
                                {negocio.google_maps_link && (
                                    <a href={negocio.google_maps_link} target="_blank" className="text-sm font-bold mt-1 inline-flex items-center gap-1 hover:underline" style={{ color: brandColor }}>Ver en Google Maps <ArrowRight size={14}/></a>
                                )}
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: brandColor + '20', color: brandColor }}><Clock size={20}/></div>
                            <div className="w-full max-w-sm">
                                <h4 className="font-bold mb-3" style={{ color: textColor }}>Horarios de Atención</h4>
                                <div className="space-y-2 text-sm opacity-90">
                                    {(() => {
                                        const dayNames = { "1": "Lunes", "2": "Martes", "3": "Miércoles", "4": "Jueves", "5": "Viernes", "6": "Sábado", "0": "Domingo" };
                                        const order = ["1", "2", "3", "4", "5", "6", "0"];
                                        const groups: { scheduleStr: string, days: string[], isOpen: boolean }[] = [];

                                        order.forEach(dayKey => {
                                            const dayConfig = rawConfig.schedule?.[dayKey];
                                            const name = dayNames[dayKey as keyof typeof dayNames];
                                            let scheduleStr = "";
                                            let isOpen = false;

                                            if (dayConfig && dayConfig.isOpen) {
                                                isOpen = true;
                                                if (dayConfig.ranges && dayConfig.ranges.length > 0) {
                                                    scheduleStr = dayConfig.ranges.map((r: any) => `de ${r.start} a ${r.end}`).join(' y ');
                                                } else {
                                                    // Fallback seguro para configuraciones viejas en la DB
                                                    const oldConfig = dayConfig as any;
                                                    scheduleStr = `de ${oldConfig.start || '09:00'} a ${oldConfig.end || '18:00'}`;
                                                }
                                            } else {
                                                scheduleStr = "Cerrado";
                                            }

                                            const existingGroup = groups.find(g => g.scheduleStr === scheduleStr);
                                            if (existingGroup) {
                                                existingGroup.days.push(name);
                                            } else {
                                                groups.push({ scheduleStr, days: [name], isOpen });
                                            }
                                        });

                                        return groups.map((g, i) => {
                                            let daysText = g.days.join(' / ');
                                            
                                            if (g.days.length === 5 && g.days[0] === "Lunes" && g.days[4] === "Viernes") {
                                                daysText = "Lunes a Viernes";
                                            } else if (g.days.length === 7) {
                                                daysText = "Todos los días";
                                            } else if (g.days.length === 2 && g.days[0] === "Sábado" && g.days[1] === "Domingo") {
                                                daysText = "Fines de semana";
                                            }

                                            return (
                                                <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline gap-1 sm:gap-4 pb-2 border-b border-zinc-500/10 last:border-0 last:pb-0">
                                                    <span className="font-medium min-w-[120px]" style={{ color: textColor }}>{daysText}</span>
                                                    {g.isOpen ? (
                                                        <span className="text-[13px] sm:text-right opacity-80 leading-snug">{g.scheduleStr}</span>
                                                    ) : (
                                                        <span className="text-[13px] sm:text-right text-red-500 italic">Cerrado</span>
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: brandColor + '20', color: brandColor }}><Phone size={20}/></div>
                            <div>
                                <h4 className="font-bold" style={{ color: textColor }}>Contacto Directo</h4>
                                {negocio.whatsapp ? (
                                    <a 
                                        href={`https://wa.me/${negocio.whatsapp.replace(/[^0-9]/g, '')}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="opacity-70 hover:underline hover:text-green-600 transition-colors"
                                    >
                                        {negocio.whatsapp}
                                    </a>
                                ) : (
                                    <p className="opacity-70">No especificado</p>
                                )}
                            </div>
                        </div>
                        {/* Redes Sociales */}
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: brandColor + '20', color: brandColor }}><Globe size={20}/></div>
                            <div>
                                <h4 className="font-bold" style={{ color: textColor }}>Redes Sociales</h4>
                                {/* INSTAGRAM */}
                                {negocio.instagram && (
                                    <a 
                                        href={negocio.instagram} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm font-medium hover:text-pink-400 transition-colors"
                                    >
                                        <Instagram size={18} />
                                        <span>Instagram</span>
                                    </a>
                                )}

                                {/* FACEBOOK */}
                                {negocio.facebook && (
                                    <a 
                                        href={negocio.facebook} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm font-medium hover:text-blue-400 transition-colors"
                                    >
                                        <Facebook size={18} />
                                        <span>Facebook</span>
                                    </a>
                                )}

                                {/* LINKEDIN */}
                                {negocio.linkedin && (
                                    <a 
                                        href={negocio.linkedin} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm font-medium hover:text-sky-400 transition-colors"
                                    >
                                        <Linkedin size={18} />
                                        <span>LinkedIn</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Mapa o Imagen Representativa */}
                <div className={`h-[400px] bg-zinc-100 overflow-hidden shadow-2xl relative ${radiusClass}`}>
                    {/* Si tuvieras una API Key de Maps real podrías usar un iframe, por ahora simulamos con imagen o el link */}
                    <div className="absolute inset-0 bg-zinc-200 flex items-center justify-center text-zinc-400">
                        {negocio.google_maps_link ? (
                            <iframe width="100%" height="100%" src={`https://maps.google.com/maps?q=${encodeURIComponent(negocio.direccion)}&t=&z=15&ie=UTF8&iwloc=&output=embed`} title="Mapa"></iframe>
                        ) : (
                            <div className="text-center p-6"><MapPin size={48} className="mx-auto mb-2 opacity-50"/>Mapa no disponible</div>
                        )}
                    </div>
                </div>
            </div>
        </section>
      )}
      


      {/* --- FOOTER / CONTACTO --- */}
      <div id="contacto">
        {config.footer?.mostrar && <Footer data={config.footer} negocioNombre={negocio.nombre} />}
      </div>
      {/* --- LIGHTBOX (MODAL DE IMAGEN) --- */}
      {selectedImage && (
        <div 
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={() => setSelectedImage(null)}
        >
            <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-3 bg-white/10 text-white hover:bg-white/20 rounded-full transition-colors z-50"
            >
                <X size={24} />
            </button>
            <img 
                src={selectedImage} 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300" 
                onClick={(e) => e.stopPropagation()} 
                alt="Vista completa"
            />
        </div>
      )}
      {/* --- MODALES (NO CAMBIADOS, SE MANTIENEN IGUAL) --- */}
      {isBookingModalOpen && (
        <Modal onClose={() => setIsBookingModalOpen(false)} radiusClass={radiusClass}>
            {/* ... (Todo el contenido del modal de agendamiento igual que tu archivo original) ... */}
            {/* He resumido esta parte por brevedad, pero en tu código debes pegar el contenido exacto del modal original */}
             <div className="mb-6">
                <h3 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
                    <CalendarIcon className="text-blue-600"/> Agendar Turno
                </h3>
                <p className="text-zinc-500 text-sm">Paso {bookingStep} de 4</p>
                <div className="h-1 bg-zinc-100 rounded-full mt-2 w-full overflow-hidden">
                    <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${(bookingStep / 4) * 100}%` }}></div>
                </div>
            </div>
            {/* PASO 1: SELECCIONAR SERVICIO (CORREGIDO) */}
            {bookingStep === 1 && (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    <p className="font-bold text-zinc-700 mb-2">Seleccioná uno o más servicios:</p>
                    
                    {/* FUSIONAMOS SERVICIOS + PROMOS */}
                    {(() => {
                        const allServices = [
                            ...(config.servicios?.items || []), 
                            ...(negocio.config_web?.services || [])
                        ];
                        
                        if (allServices.length === 0) {
                            return <p className="text-center text-zinc-400 text-sm py-4">No hay servicios configurados.</p>;
                        }

                        return allServices.map((item: any, i: number) => {
                            // LÓGICA DE PROMO
                            let isPromo = item.isPromo && item.promoEndDate;

                            // Si la promo expiró, vuelve a ser un servicio normal en lugar de desaparecer
                            if (isPromo && new Date(item.promoEndDate + 'T23:59:59') < new Date()) {
                                isPromo = false; 
                            }

                            // Normalizar datos
                            const titulo = item.name || item.titulo;
                            const precio = item.price || item.precio;
                            const desc = item.description || item.desc;
                            const duracion = item.duration || item.duracion || 60;


                            const isSelected = bookingData.services.some(s => svcKey(s) === svcKey(item));
                            return (
                                <button
                                    key={item.id || i}
                                    onClick={() => toggleService(item)}
                                    className={`w-full p-4 border-2 rounded-xl text-left transition-all group relative overflow-hidden
                                        ${isSelected
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : isPromo
                                                ? 'bg-pink-50 border-pink-200 hover:border-pink-400 hover:bg-pink-100'
                                                : 'bg-white border-zinc-200 hover:bg-indigo-50 hover:border-indigo-300'
                                        }
                                    `}
                                >
                                    {isPromo && (
                                        <div className="absolute top-0 right-0 bg-pink-500 text-white text-[9px] px-2 py-0.5 font-bold uppercase rounded-bl-lg">
                                            Promo
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center w-full">
                                        <div className="flex items-center gap-2">
                                            {isSelected && <CheckCircle size={14} className="text-indigo-500 shrink-0" />}
                                            <span className={`font-bold ${isSelected ? 'text-indigo-700' : isPromo ? 'text-pink-900' : 'text-zinc-900 group-hover:text-indigo-700'}`}>
                                                {titulo}
                                            </span>
                                        </div>
                                        {precio != null && precio !== "" && Number(precio) !== 0 && (
                                            <span className={`font-semibold px-2 py-1 rounded text-sm
                                                ${isPromo
                                                    ? 'bg-pink-200 text-pink-800'
                                                    : 'bg-zinc-100 text-zinc-900 group-hover:bg-indigo-100 group-hover:text-indigo-700'
                                                }`}>
                                                {typeof precio === 'number' || !isNaN(Number(precio)) ? `$${precio}` : precio}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-xs text-zinc-500 truncate max-w-[70%]">{desc}</span>
                                        <span className={`text-xs font-bold flex items-center gap-1 ${isPromo ? 'text-pink-400' : 'text-zinc-400'}`}>
                                            <Clock size={12}/> {formatDuration(duracion)}
                                        </span>
                                    </div>
                                </button>
                            );
                        });
                    })()}

                    {bookingData.services.length > 0 && (
                        <div className="sticky bottom-0 bg-white pt-2 border-t border-zinc-100 mt-2">
                            <div className="flex justify-between items-center text-xs text-zinc-500 mb-2">
                                <span>{bookingData.services.length} servicio{bookingData.services.length > 1 ? 's' : ''} · {formatDuration(totalDuration)}</span>
                                {totalPrice > 0 && <span className="font-bold text-zinc-700">${totalPrice}</span>}
                            </div>
                            <button onClick={() => setBookingStep(2)}
                                className="w-full py-3 text-white font-bold rounded-xl text-sm transition-all"
                                style={{ backgroundColor: brandColor }}>
                                Continuar →
                            </button>
                        </div>
                    )}
                </div>
            )}
            {bookingStep === 2 && (
                <div className="space-y-4">
                    <button onClick={() => setBookingStep(1)} className="text-xs text-zinc-400">← Volver</button>
                    <h4 className="font-bold text-lg">¿Con quién te quieres atender?</h4>
                    
                    {(() => {
                        // 1. FILTRAMOS EL EQUIPO SEGÚN EL SERVICIO SELECCIONADO
                        const allowedWorkers = (config.equipo?.items || []).filter((worker: any) => {
                            return bookingData.services.every((s: any) => {
                                const requiredIds = s.workerIds;
                                if (!requiredIds || requiredIds.length === 0) return true;
                                return requiredIds.includes(worker.id);
                            });
                        });

                        // 2. RENDERIZAMOS SI HAY TRABAJADORES PERMITIDOS
                        if (config.equipo?.mostrar && allowedWorkers.length > 0) {
                            return (
                                <div className="grid gap-3">
                                    
                                    {/* Mostrar "Cualquiera" SOLO si ningún servicio tiene restricciones de profesional */}
                                    {bookingData.services.every((s: any) => !s.workerIds || s.workerIds.length === 0) && (
                                        <button 
                                            onClick={() => { setBookingData({...bookingData, worker: null}); setBookingStep(3); }}
                                            className="p-4 border border-zinc-200 rounded-xl text-left hover:bg-zinc-50 flex items-center gap-3"
                                        >
                                            <div className="bg-zinc-100 p-2 rounded-full"><Users size={20}/></div>
                                            <div>
                                                <span className="font-bold block text-zinc-900">Cualquiera disponible</span>
                                                <span className="text-xs text-zinc-500">Máxima disponibilidad</span>
                                            </div>
                                        </button>
                                    )}
                                    
                                    {/* MAPEAR SOLO LOS TRABAJADORES FILTRADOS */}
                                    {allowedWorkers.map((worker: any) => (
                                        <button 
                                            key={worker.id}
                                            onClick={() => { setBookingData({...bookingData, worker: worker}); setBookingStep(3); }}
                                            className="p-4 border border-zinc-200 rounded-xl text-left hover:bg-indigo-50 hover:border-indigo-200 flex items-center gap-3"
                                        >
                                            <img src={worker.imagenUrl || "/default-avatar.png"} className="w-10 h-10 rounded-full object-cover bg-zinc-200"/>
                                            <div>
                                                <span className="font-bold block text-zinc-900">{worker.nombre}</span>
                                                <span className="text-xs text-zinc-500">{worker.cargo}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            );
                        } else {
                            // SI NO HAY EQUIPO O NADIE HACE ESTE SERVICIO, SALTAMOS
                            return (
                                <div className="text-center py-4">
                                    <p className="text-zinc-500">No hay profesionales específicos para este servicio.</p>
                                    <button 
                                        onClick={() => { setBookingData({...bookingData, worker: null}); setBookingStep(3); }} 
                                        className="mt-2 text-blue-600 font-bold"
                                    >
                                        Continuar
                                    </button>
                                </div>
                            );
                        }
                    })()}
                </div>
            )}
            {/* PASO 3 */}
            {bookingStep === 3 && (
                <div className="space-y-4">
                     {/* El botón de volver debería llevar al paso 2, no al 1, si viniste de elegir profesional */}
                     <button onClick={() => setBookingStep(2)} className="text-xs text-zinc-400">← Volver</button>
                     
                    <input
                        type="date"
                        min={getLocalDateString()}
                        className="w-full p-3 border rounded-xl"
                        onChange={handleDateChange}
                    />

                    {dateError && (
                        <InlineAlert type="error" message={dateError} onDismiss={() => setDateError("")} />
                    )}

                     {bookingData.date && !dateError && (
                         loadingSlots ? <Loader2 className="animate-spin mx-auto"/> :
                         generateTimeSlots().length === 0 ? (
                            <p className="text-sm text-center text-zinc-500 py-4">No hay horarios disponibles para este día.</p>
                         ) :
                         <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                            {generateTimeSlots().map((slot) => (
                                <button
                                    key={slot.time}
                                    disabled={!slot.available}
                                    onClick={() => {
                                        setBookingData({...bookingData, time: slot.time});
                                        setBookingStep(4);
                                    }}
                                    className={`py-2 text-sm rounded-lg border ${slot.available ? 'hover:bg-blue-50 border-zinc-200' : 'bg-zinc-100 text-zinc-300'}`}
                                >
                                    {slot.time}
                                </button>
                            ))}
                         </div>
                     )}
                </div>
            )}
            {/* PASO 4 */}
            {bookingStep === 4 && (
                <form onSubmit={handleConfirmBooking} className="space-y-4">
                    {/* Botón Volver */}
                    <button type="button" onClick={() => setBookingStep(2)} className="text-xs text-zinc-400">
                        ← Volver
                    </button>

                    {/* Resumen del Turno */}
                    <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800 border border-blue-100">
                        Turno: {new Date(bookingData.date + 'T00:00:00').toLocaleDateString()} - {bookingData.time}hs
                    </div>

                    {/* Datos del Cliente */}
                    <input 
                        required 
                        placeholder="Nombre y Apellido" 
                        className="w-full p-3 border rounded-xl" 
                        value={bookingData.clientName}
                        onChange={e => setBookingData({...bookingData, clientName: e.target.value})}
                    />
                    <div>
                        <label className="text-xs font-bold text-zinc-500 ml-1 mb-1 block">Número de WhatsApp</label>
                        <div className="flex gap-2 items-center">
                            
                            {/* PREFIJO FIJO (No se puede editar) */}
                            <div className="flex items-center justify-center px-3 py-3.5 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-600 font-bold shrink-0 select-none">
                                🇦🇷 +54 9
                            </div>
                            
                            {/* CÓDIGO DE ÁREA */}
                            <input 
                                required 
                                type="tel"
                                placeholder="Área (Ej: 11)" 
                                className="w-[100px] p-3 border rounded-xl text-center font-medium" 
                                value={bookingData.clientAreaCode}
                                // La regex (/\D/g, '') asegura que SOLO puedan escribir números
                                onChange={e => setBookingData({...bookingData, clientAreaCode: e.target.value.replace(/\D/g, '')})}
                                maxLength={4}
                            />
                            
                            {/* RESTO DEL NÚMERO */}
                            <input 
                                required 
                                type="tel"
                                placeholder="Número (Ej: 2345 6789)" 
                                className="w-full p-3 border rounded-xl font-medium" 
                                value={bookingData.clientLocalNumber}
                                onChange={e => setBookingData({...bookingData, clientLocalNumber: e.target.value.replace(/\D/g, '')})}
                                maxLength={10}
                            />
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1.5 ml-1 leading-tight">
                            Ingresá tu código de área <b>sin el 0</b> y tu número <b>sin el 15</b>.
                        </p>
                    </div>
                    <input 
                        required 
                        type="email"
                        placeholder="Email" 
                        className="w-full p-3 border rounded-xl" 
                        value={bookingData.clientEmail}
                        onChange={e => setBookingData({...bookingData, clientEmail: e.target.value})}
                    />

                    {config.booking?.requireManualConfirmation && (
                        <>
                            {/* Mensaje Opcional */}
                            <textarea 
                                placeholder="Mensaje explicativo (opcional)" 
                                className="w-full p-3 border rounded-xl" 
                                value={bookingData.message}
                                onChange={e => setBookingData({...bookingData, message: e.target.value})}
                            />

                            {/* --- SECCIÓN DE IMÁGENES CORREGIDA --- */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-700">Adjuntar imágenes</label>
                                <input 
                                    type="file" 
                                    multiple 
                                    accept="image/*"
                                    disabled={uploadingImages} // Bloquea el input mientras sube
                                    onChange={async (e) => {
                                        const files = e.target.files;
                                        if (!files || files.length === 0) return;

                                        setUploadingImages(true); // Activa estado de carga
                                        const uploadedUrls: string[] = [];

                                        try {
                                            for (const file of Array.from(files)) {
                                                // Sanitizar nombre de archivo
                                                const fileExt = file.name.split('.').pop();
                                                const fileName = `${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
                                                const filePath = `${fileName}`;

                                                // 1. Subir al bucket 'appointment-attachments'
                                                const { data, error } = await supabase.storage
                                                    .from('appointment-attachments') 
                                                    .upload(filePath, file);

                                                if (error) {
                                                    console.error("Error subiendo imagen:", error);
                                                    setBookingError(`Error al subir imagen: ${error.message}`);
                                                    continue;
                                                }

                                                if (data) {
                                                    // 2. Obtener URL pública
                                                    const { data: { publicUrl } } = supabase.storage
                                                        .from('appointment-attachments')
                                                        .getPublicUrl(filePath);
                                                    
                                                    uploadedUrls.push(publicUrl);
                                                }
                                            }

                                            // 3. Guardar URLs en el estado
                                            if (uploadedUrls.length > 0) {
                                                setBookingData(prev => ({ 
                                                    ...prev, 
                                                    images: [...prev.images, ...uploadedUrls] 
                                                }));
                                            }

                                        } catch (err) {
                                            console.error("Error inesperado:", err);
                                            setBookingError("Ocurrió un error inesperado al procesar las imágenes.");
                                        } finally {
                                            setUploadingImages(false); // Libera el bloqueo
                                        }
                                    }}
                                    className="w-full text-sm text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 cursor-pointer"
                                />
                                
                                {/* Mensaje de carga */}
                                {uploadingImages && (
                                    <p className="text-xs text-blue-600 animate-pulse font-medium">
                                        Subiendo imágenes a la nube, por favor espera...
                                    </p>
                                )}
                                
                                {/* Vista previa de imágenes subidas */}
                                {bookingData.images.length > 0 && (
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                        {bookingData.images.map((url, i) => (
                                            <div key={i} className="relative w-16 h-16 border rounded-lg overflow-hidden shadow-sm">
                                                <img src={url} className="w-full h-full object-cover" alt="preview" />
                                                {/* Botón para eliminar imagen subida (opcional) */}
                                                <button
                                                    type="button"
                                                    onClick={() => setBookingData(prev => ({
                                                        ...prev,
                                                        images: prev.images.filter((_, idx) => idx !== i)
                                                    }))}
                                                    className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg hover:bg-red-600"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {bookingError && (
                        <InlineAlert type="error" message={bookingError} onDismiss={() => setBookingError("")} />
                    )}

                    {/* Botón Confirmar */}
                    <button
                        type="submit"
                        disabled={enviando || uploadingImages}
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
                    >
                        {enviando ? <Loader2 className="animate-spin"/> : (uploadingImages ? "Subiendo fotos..." : "Enviar solicitud de turno")}
                    </button>
                    <p className="text-center text-xs text-zinc-400 mt-4">
                    El negocio recibirá una solicitud de turno, y tú recibirás un correo de confirmación.
                </p>
                </form>
            )}
        </Modal>
      )}

      {/* MODAL EXITO */}
    {mostrarGracias && (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white p-8 rounded-[2rem] shadow-2xl text-center max-w-sm border border-zinc-100">
        
        {/* Icono con una sutil animación de pulso */}
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-500" strokeWidth={2.5} />
        </div>

        <h3 className="text-2xl font-bold text-zinc-800">¡Todo listo!</h3>
        
        <div className="space-y-3 mt-4">
            <p className="text-zinc-600 leading-relaxed">
            Tu solicitud de turno ha sido enviada con éxito al negocio.
            </p>
            <p className="text-sm text-zinc-400 bg-zinc-50 p-3 rounded-xl border border-dashed border-zinc-200">
            Te enviaremos un <strong>correo de confirmación</strong> con el precio final del servicio en breve.
            </p>
        </div>

        <button 
            onClick={() => setMostrarGracias(false)} 
            className="mt-8 w-full py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200"
        >
            Entendido
        </button>
        </div>
    </div>
    )}

      

      {showGoogleReviewPrompt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl text-center max-w-sm border border-zinc-100 space-y-4">
            <p className="text-2xl">⭐</p>
            <h3 className="text-xl font-bold text-zinc-800">¡Muchas gracias por tu calificación!</h3>
            <p className="text-sm text-zinc-500">¿Te gustaría ayudarnos publicando tu opinión en Google Maps?</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { window.open(negocio.google_maps_link, '_blank'); setShowGoogleReviewPrompt(false); }}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Sí, con gusto
              </button>
              <button
                onClick={() => setShowGoogleReviewPrompt(false)}
                className="px-5 py-2 bg-zinc-100 text-zinc-600 text-sm font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
              >
                No, gracias
              </button>
            </div>
          </div>
        </div>
      )}

      {isFeedbackModalOpen && (
        <Modal onClose={() => setIsFeedbackModalOpen(false)} radiusClass={radiusClass}>
             <h3 className="text-2xl font-bold mb-4 text-center">Tu opinión</h3>
             <form onSubmit={handleEnviarFeedback} className="space-y-4">
                 <div className="flex justify-center gap-2">
                     {[1,2,3,4,5].map(s => <button key={s} type="button" onClick={() => setRatingSeleccionado(s)}><Star size={32} className={s <= ratingSeleccionado ? "fill-yellow-400 text-yellow-400" : "text-zinc-300"}/></button>)}
                 </div>
                 <input required placeholder="Tu Nombre" value={nombreCliente} onChange={e => setNombreCliente(e.target.value)} className="w-full p-3 border rounded-xl"/>
                 <textarea placeholder="Comentario..." value={feedbackComentario} onChange={e => setFeedbackComentario(e.target.value)} className="w-full p-3 border rounded-xl"/>
                 {feedbackError && (
                     <InlineAlert type="error" message={feedbackError} onDismiss={() => setFeedbackError("")} />
                 )}
                 <button type="submit" disabled={enviando} className="w-full bg-zinc-900 text-white font-bold py-3 rounded-xl">{enviando ? <Loader2 className="animate-spin"/> : "Enviar"}</button>
             </form>
        </Modal>
      )}

    </div>
  );
}

// COMPONENTE AUXILIAR MODAL
function Modal({ children, onClose, radiusClass }: any) {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-md animate-in fade-in">
          {/* Agregamos text-zinc-900 aquí para que todo el texto dentro sea oscuro por defecto */}
          <div className={`bg-white text-zinc-900 shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 ${radiusClass}`}>
            <button onClick={onClose} className="absolute top-4 right-4 p-2 text-zinc-300 hover:text-zinc-900 transition-colors"><X size={20} /></button>
            {children}
          </div>
        </div>
    )
}