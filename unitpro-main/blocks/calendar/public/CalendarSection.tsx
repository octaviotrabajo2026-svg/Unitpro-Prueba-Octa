"use client";
// blocks/calendar/public/CalendarSection.tsx

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import {
  CalendarIcon, Clock, CheckCircle, X, Loader2,
  ChevronLeft, User, Users, Star, Tag, Image as ImageIcon,
} from "lucide-react";
import { checkAvailability } from "@/app/actions/confirm-booking/check-availability";
import { createAppointment } from "@/app/actions/confirm-booking/manage-appointment";
import type { BlockSectionProps } from "@/types/blocks";
import { formatDuration } from "@/lib/format-duration";

const INTERVAL_STEP = 30;

export default function CalendarSection({ negocio, config: blockConfig }: BlockSectionProps) {
  const supabase = createClient();

  // ── Config merge ──────────────────────────────────────────────────────────
  const raw = negocio?.config_web || {};
  const cfg = {
    colors:    { primary: negocio?.color_principal || "#000000", ...raw.colors, ...(blockConfig?.colors as object) },
    servicios: { mostrar: true, titulo: "Nuestros Servicios", items: [], ...raw.servicios, ...(blockConfig?.servicios as object) },
    equipo:    { mostrar: false, items: [], scheduleType: "unified", ...raw.equipo, ...(blockConfig?.equipo as object) },
    appearance:{ font: "sans", radius: "medium", ...(blockConfig?.appearance as object) ?? raw.appearance },
    booking:   { requireManualConfirmation: true, ...raw.booking, ...(blockConfig?.booking as object) },
  };

  const brandColor  = cfg.colors.primary as string;
  const textColor   = (raw.colors?.text as string) || "#1f2937";
  const requireManual = !!(cfg.booking as any).requireManualConfirmation;
  const allowMultipleServices = !!(cfg.booking as any).allowMultipleServices;

  // Radius para distintos usos:
  // cardRadius   → tarjetas grandes (servicios, equipo, reseñas)
  // inputRadius  → inputs, selects
  // btnRadius    → botones
  // modalRadius  → SIEMPRE rounded-2xl para evitar el círculo con radius=full
  const r = (cfg.appearance as any).radius as string;
  const cardRadius  = { none: "rounded-none", medium: "rounded-2xl",    full: "rounded-3xl"  }[r] ?? "rounded-2xl";
  const inputRadius = { none: "rounded-none", medium: "rounded-xl",     full: "rounded-2xl"  }[r] ?? "rounded-xl";
  const btnRadius   = { none: "rounded-none", medium: "rounded-xl",     full: "rounded-full" }[r] ?? "rounded-xl";

  // ── Estado ────────────────────────────────────────────────────────────────
  const [isModalOpen,      setIsModalOpen]      = useState(false);
  const [bookingStep,      setBookingStep]      = useState(1);
  const [busySlots,        setBusySlots]        = useState<any[]>([]);
  const [loadingSlots,     setLoadingSlots]     = useState(false);
  const [enviando,         setEnviando]         = useState(false);
  const [uploadingImages,  setUploadingImages]  = useState(false);
  const [mostrarGracias,   setMostrarGracias]   = useState(false);
  const [wasPending,       setWasPending]       = useState(true); // para el mensaje de éxito
  const [selectedServices, setSelectedServices] = useState<any[]>([]);

  const [bookingData, setBookingData] = useState({
    date: "", time: "", worker: null as any,
    clientName: "", clientLastName: "", clientPhone: "", clientEmail: "",
    message: "", clientCountryCode: "+54", clientAreaCode: "", clientLocalNumber: "",
    images: [] as string[],
  });

  // Códigos de país ordenados: Argentina primero, luego el resto alfabético
  const COUNTRY_CODES = [
    { code: "+54",  flag: "🇦🇷", name: "Argentina" },
    { code: "+591", flag: "🇧🇴", name: "Bolivia" },
    { code: "+55",  flag: "🇧🇷", name: "Brasil" },
    { code: "+56",  flag: "🇨🇱", name: "Chile" },
    { code: "+57",  flag: "🇨🇴", name: "Colombia" },
    { code: "+506", flag: "🇨🇷", name: "Costa Rica" },
    { code: "+53",  flag: "🇨🇺", name: "Cuba" },
    { code: "+593", flag: "🇪🇨", name: "Ecuador" },
    { code: "+503", flag: "🇸🇻", name: "El Salvador" },
    { code: "+502", flag: "🇬🇹", name: "Guatemala" },
    { code: "+509", flag: "🇭🇹", name: "Haití" },
    { code: "+504", flag: "🇭🇳", name: "Honduras" },
    { code: "+52",  flag: "🇲🇽", name: "México" },
    { code: "+505", flag: "🇳🇮", name: "Nicaragua" },
    { code: "+507", flag: "🇵🇦", name: "Panamá" },
    { code: "+595", flag: "🇵🇾", name: "Paraguay" },
    { code: "+51",  flag: "🇵🇪", name: "Perú" },
    { code: "+1787",flag: "🇵🇷", name: "Puerto Rico" },
    { code: "+1809",flag: "🇩🇴", name: "República Dominicana" },
    { code: "+598", flag: "🇺🇾", name: "Uruguay" },
    { code: "+58",  flag: "🇻🇪", name: "Venezuela" },
    { code: "+34",  flag: "🇪🇸", name: "España" },
    { code: "+1",   flag: "🇺🇸", name: "Estados Unidos" },
    { code: "+1",   flag: "🇨🇦", name: "Canadá" },
    { code: "+44",  flag: "🇬🇧", name: "Reino Unido" },
    { code: "+49",  flag: "🇩🇪", name: "Alemania" },
    { code: "+33",  flag: "🇫🇷", name: "Francia" },
    { code: "+39",  flag: "🇮🇹", name: "Italia" },
    { code: "+351", flag: "🇵🇹", name: "Portugal" },
    { code: "+61",  flag: "🇦🇺", name: "Australia" },
    { code: "+81",  flag: "🇯🇵", name: "Japón" },
    { code: "+86",  flag: "🇨🇳", name: "China" },
    { code: "+91",  flag: "🇮🇳", name: "India" },
    { code: "+972", flag: "🇮🇱", name: "Israel" },
    { code: "+27",  flag: "🇿🇦", name: "Sudáfrica" },
  ];

  // ── Escuchar CTA del Hero ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      setSelectedServices([]);
      setBookingData(p => ({ ...p, date: "", time: "", worker: null, images: [] }));
      setBookingStep(1);
      setIsModalOpen(true);
    };
    window.addEventListener("unitpro:open-booking", handler);
    return () => window.removeEventListener("unitpro:open-booking", handler);
  }, []);

  // ── Cargar slots al elegir fecha ──────────────────────────────────────────
  useEffect(() => {
    if (!bookingData.date || selectedServices.length === 0) return;
    setLoadingSlots(true);
    setBusySlots([]);
    checkAvailability(negocio.slug, bookingData.date, bookingData.worker?.id)
      .then(r => {
        setBusySlots((r as any).busy || []);
        setLoadingSlots(false);
      });
  }, [bookingData.date, bookingData.worker, selectedServices]);

  // ── Duración y precio totales ─────────────────────────────────────────────
  const totalDuration = selectedServices.reduce((acc, s) => acc + Number(s.duracion || s.duration || 60), 0);
  const totalPrice    = selectedServices.reduce((acc, s) => acc + Number(s.precio   || s.price   || 0),  0);

  // ── Generador de slots (lógica legacy) ────────────────────────────────────
  const generateSlots = (): string[] => {
    if (!bookingData.date || selectedServices.length === 0) return [];

    let schedule = raw.schedule || {};
    if ((cfg.equipo as any).scheduleType === "per_worker" && bookingData.worker?.schedule) {
      schedule = bookingData.worker.schedule;
    }

    const [year, month, day] = bookingData.date.split("-").map(Number);
    const dayOfWeek = String(new Date(year, month - 1, day).getDay());
    const dayConfig = schedule[dayOfWeek];
    if (!dayConfig || !dayConfig.isOpen) return [];

    let ranges: { start: string; end: string }[] = [];
    if (dayConfig.ranges && Array.isArray(dayConfig.ranges)) {
      ranges = dayConfig.ranges;
    } else if (dayConfig.start && dayConfig.end) {
      ranges = [{ start: dayConfig.start, end: dayConfig.end }];
    } else {
      ranges = [{ start: "09:00", end: "18:00" }];
    }

    const slots: string[] = [];

    for (const range of ranges) {
      const [sh, sm] = range.start.split(":").map(Number);
      const [eh, em] = range.end.split(":").map(Number);
      const close = new Date(`${bookingData.date}T${String(eh).padStart(2,"0")}:${String(em).padStart(2,"0")}:00`);

      for (let h = sh; h <= eh; h++) {
        for (let m = 0; m < 60; m += INTERVAL_STEP) {
          if (h === sh && m < sm) continue;
          if (h > eh || (h === eh && m >= em)) break;

          const t     = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
          const start = new Date(`${bookingData.date}T${t}:00`);
          const end   = new Date(start.getTime() + totalDuration * 60_000);
          if (end > close) continue;

          let overlapping = 0;
          for (const b of busySlots) {
            if (start < new Date(b.end) && end > new Date(b.start)) overlapping++;
          }
          const availabilityMode = (cfg.equipo as any).availabilityMode || 'sala_unica';
          const isGlobal = availabilityMode === 'global' || availabilityMode === 'sala_unica';
          const permiteSimultaneo = bookingData.worker?.allowSimultaneous === true
            || String(bookingData.worker?.allowSimultaneous) === 'true';
          const capacity = (!isGlobal && permiteSimultaneo)
            ? Number(bookingData.worker?.simultaneousCapacity) || 2
            : 1;
          if (overlapping < capacity) slots.push(t);
        }
      }
    }
    return slots.sort((a, b) => a.localeCompare(b));
  };

  // ── Toggle servicio ───────────────────────────────────────────────────────
  const svcKey    = (s: any) => s.id || s.titulo || s.name;
  const toggleSvc = (s: any) => {
    setSelectedServices(prev => {
      const exists = prev.some(x => svcKey(x) === svcKey(s));
      if (exists) {
        // Si ya estaba seleccionado, lo deseleccionamos
        return prev.filter(x => svcKey(x) !== svcKey(s));
      } else {
        // Si NO permite múltiples, reemplazamos el array por el nuevo servicio.
        // Si SÍ lo permite, lo agregamos a la lista.
        return allowMultipleServices ? [...prev, s] : [s];
      }
    });
    setBookingData(p => ({ ...p, time: "" }));
  };
  const isSvcSelected = (s: any) => selectedServices.some(x => svcKey(x) === svcKey(s));

  // ── Filtro de equipo por servicios seleccionados ──────────────────────────
  const equipoFiltrado = ((cfg.equipo as any).items || []).filter((w: any) => {
    if (selectedServices.length === 0) return true;
    return selectedServices.every((s: any) => {
      const ids: string[] = s.workerIds || [];
      return ids.length === 0 || ids.includes(w.id);
    });
  });

  // ── Subir imagen adjunta ──────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingImages(true);
    const urls: string[] = [];
    for (const file of files) {
      const ext  = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from("appointment-attachments").upload(path, file);
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from("appointment-attachments").getPublicUrl(path);
        urls.push(publicUrl);
      }
    }
    setBookingData(p => ({ ...p, images: [...p.images, ...urls] }));
    setUploadingImages(false);
    e.target.value = "";
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedServices.length || !bookingData.date || !bookingData.time) return;
    setEnviando(true);

    const phone = bookingData.clientAreaCode && bookingData.clientLocalNumber
      ? `${bookingData.clientCountryCode}${bookingData.clientAreaCode}${bookingData.clientLocalNumber}`
      : bookingData.clientPhone;

    const start = new Date(`${bookingData.date}T${bookingData.time}:00`);
    const end   = new Date(start.getTime() + totalDuration * 60_000);

    const result: any = await createAppointment(negocio.slug, {
      service:     selectedServices.map(s => s.titulo || s.name).join(" + "),
      workerName:  bookingData.worker?.nombre || null,
      workerId:    bookingData.worker?.id     || null,
      clientName:  `${bookingData.clientName} ${bookingData.clientLastName}`.trim(),
      clientEmail: bookingData.clientEmail,
      clientPhone: phone,
      start:       start.toISOString(),
      end:         end.toISOString(),
      message:     bookingData.message,
      images:      bookingData.images,
    });

    setWasPending(result?.pending !== false);
    setEnviando(false);
    setMostrarGracias(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setMostrarGracias(false);
      setBookingStep(1);
      setSelectedServices([]);
      setBookingData({ date:"", time:"", worker:null, clientName:"",clientLastName:"", clientPhone:"",
        clientEmail:"", message:"", clientAreaCode:"", clientLocalNumber:"",
        clientCountryCode: "+54", images:[] });
    }, 3500);
  };

  const resetModal = () => {
    setIsModalOpen(false);
    setBookingStep(1);
    setSelectedServices([]);
    setBookingData(p => ({ ...p, date:"", time:"", worker:null, images:[] }));
  };

  const allServices = [...((cfg.servicios as any)?.items || []), ...(raw.services || [])];
  const equipo      = (cfg.equipo as any)?.items || [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Sección Servicios ────────────────────────────────────────────── */}
      <section id="servicios" className="py-24 px-6" style={{ color: textColor }}>
        <div className="max-w-7xl mx-auto">
          {(cfg.servicios as any)?.titulo && (
            <div className="text-center mb-16">
              <span className="text-sm font-bold uppercase tracking-wider opacity-60">Lo que hacemos</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-2" style={{ color: textColor }}>
                {(cfg.servicios as any).titulo}
              </h2>
              <div className="w-20 h-1.5 mt-4 mx-auto rounded-full" style={{ backgroundColor: brandColor }} />
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            {allServices.map((service: any, i: number) => {
              let isPromo = service.isPromo && service.promoEndDate;
              if (isPromo && new Date(service.promoEndDate + "T23:59:59") < new Date()) isPromo = false;
              const titulo    = service.name    || service.titulo;
              const precio    = service.price   || service.precio;
              const desc      = service.description || service.desc;
              const duracion  = Number(service.duration || service.duracion || 60);
              const imagenUrl = service.image   || service.imagenUrl;

              return (
                <div key={service.id || i}
                  onClick={() => { toggleSvc(service); setBookingStep(1); setIsModalOpen(true); }}
                  className={`relative p-8 transition-all duration-300 group cursor-pointer overflow-hidden ${cardRadius} ${
                    isPromo
                      ? "bg-gradient-to-br from-pink-50 to-white border-2 border-pink-200 shadow-lg shadow-pink-100 hover:-translate-y-2"
                      : "border border-zinc-500/10 shadow-sm hover:shadow-xl hover:-translate-y-2"
                  }`}
                  style={{ backgroundColor: isPromo ? undefined : "rgba(255,255,255,0.05)" }}
                >
                  {isPromo && (
                    <div className="absolute top-4 right-4 bg-pink-600 text-white text-[10px] font-bold px-3 py-1 rounded-full z-10 flex items-center gap-1">
                      <Tag size={10} /> Oferta
                    </div>
                  )}
                  {imagenUrl ? (
                    <div className={`w-full h-48 mb-6 overflow-hidden shadow-md ${inputRadius}`}>
                      <img src={imagenUrl} alt={titulo} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  ) : (
                    <div className={`w-14 h-14 mb-6 text-white flex items-center justify-center shadow-lg ${inputRadius}`}
                      style={{ backgroundColor: isPromo ? "#db2777" : brandColor }}>
                      {isPromo ? <Tag size={28} /> : <CheckCircle size={28} />}
                    </div>
                  )}
                  <h3 className="font-bold text-xl mb-3">{titulo}</h3>
                  {precio != null && precio !== "" && Number(precio) !== 0 && (
                    <p className="opacity-70 mb-4 font-medium">
                      {typeof precio === "number" || !isNaN(Number(precio)) ? `$${precio}` : precio}
                    </p>
                  )}
                  {isPromo && (
                    <div className="mb-4 text-xs font-bold text-pink-600 bg-pink-100/50 p-2 rounded-lg text-center border border-pink-100">
                      🔥 Válido hasta el {new Date(service.promoEndDate).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 mb-2">
                    <Clock size={12} /><span>{formatDuration(duracion)}</span>
                  </div>
                  <p className="opacity-70 text-sm line-clamp-3">{desc}</p>
                  <div className={`mt-6 w-full py-2 text-center text-sm font-bold transition-colors ${
                    isPromo ? "bg-pink-600 text-white" : "bg-zinc-100 text-zinc-600 group-hover:bg-zinc-900 group-hover:text-white"
                  } ${btnRadius}`}>
                    Reservar Turno
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Sección Equipo ───────────────────────────────────────────────── */}
      {(cfg.equipo as any)?.mostrar && equipo.length > 0 && (
        <section id="equipo" className="py-24 px-6 bg-zinc-50 border-t border-zinc-200">
          <div className="max-w-7xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mt-2 mb-4 text-zinc-900">{(cfg.equipo as any).titulo}</h2>
          </div>
          <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-8">
            {equipo.map((item: any, i: number) => (
              <div key={i} className={`w-full sm:w-[calc(50%-2rem)] md:w-[280px] flex flex-col items-center text-center p-6 bg-white shadow-sm border border-zinc-100 hover:shadow-lg hover:-translate-y-1 transition-all ${cardRadius}`}>
                <div className="w-24 h-24 rounded-full overflow-hidden mb-4 bg-zinc-100 border-2 border-white shadow-md">
                  {item.imagenUrl || item.photoUrl ? (
                    <img src={item.imagenUrl || item.photoUrl} className="w-full h-full object-cover" alt={item.nombre} />
                  ) : (
                    <Users className="w-full h-full p-6 text-zinc-300" />
                  )}
                </div>
                <h3 className="font-bold text-lg text-zinc-900">{item.nombre}</h3>
                <p className="text-zinc-500">{item.cargo || item.role}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Modal de Reserva ─────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          {/* Contenedor SIEMPRE rounded-2xl — nunca btnRadius para evitar círculo */}
          <div className="bg-white w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl rounded-t-2xl sm:rounded-2xl p-6 animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

            {mostrarGracias ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: brandColor + "20" }}>
                  <CheckCircle size={32} style={{ color: brandColor }} />
                </div>
                {/* FIX #9: mensaje distinto según confirmación manual */}
                {wasPending ? (
                  <>
                    <h3 className="text-2xl font-bold text-zinc-900 mb-2">¡Solicitud enviada!</h3>
                    <p className="text-zinc-500">Te contactaremos para confirmar tu turno.</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-bold text-zinc-900 mb-2">¡Reserva confirmada!</h3>
                    <p className="text-zinc-500">Tu turno fue agendado. ¡Te esperamos!</p>
                  </>
                )}
              </div>
            ) : (
              <>
                {/* Header modal */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 flex items-center gap-2">
                      <CalendarIcon size={20} style={{ color: brandColor }} /> Agendar Turno
                    </h3>
                    <p className="text-zinc-400 text-sm">Paso {bookingStep} de 4</p>
                  </div>
                  <button onClick={resetModal} className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-100">
                    <X size={20} />
                  </button>
                </div>

                {/* Progreso */}
                <div className="h-1 bg-zinc-100 rounded-full mb-6 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(bookingStep / 4) * 100}%`, backgroundColor: brandColor }} />
                </div>

                {/* ── Paso 1: Servicios ── */}
                {bookingStep === 1 && (
                  <div className="space-y-3">
                    <p className="font-bold text-zinc-700 mb-2">
                      {allowMultipleServices ? "Seleccioná uno o más servicios:" : "Seleccioná un servicio:"}
                    </p>

                    {selectedServices.length > 0 && (
                      <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-100 mb-2">
                        {selectedServices.map((s, i) => (
                          <span key={i} className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: brandColor }}>
                            {s.titulo || s.name}
                            <button onClick={() => toggleSvc(s)} className="ml-1 opacity-70 hover:opacity-100"><X size={10} /></button>
                          </span>
                        ))}
                        <div className="w-full flex justify-between items-center text-xs text-zinc-500 pt-1 border-t border-zinc-200 mt-1">
                          <span className="flex items-center gap-1"><Clock size={11} /> {formatDuration(totalDuration)}</span>
                          {totalPrice > 0 && <span className="font-bold">${totalPrice} total</span>}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                      {allServices.length === 0 ? (
                        <p className="text-center text-zinc-400 text-sm py-4">No hay servicios configurados.</p>
                      ) : allServices.map((item: any, i: number) => {
                        const titulo   = item.name  || item.titulo;
                        const precio   = item.price || item.precio;
                        const duracion = Number(item.duration || item.duracion || 60);
                        const selected = isSvcSelected(item);
                        return (
                          <button key={item.id || i} onClick={() => toggleSvc(item)}
                            className={`w-full p-4 border-2 text-left transition-all flex items-center justify-between gap-3 ${inputRadius} ${
                              selected ? "border-transparent text-white" : "border-zinc-200 hover:border-zinc-400 hover:bg-zinc-50"
                            }`}
                            style={selected ? { backgroundColor: brandColor } : {}}>
                            <div>
                              <p className={`font-bold ${selected ? "text-white" : "text-zinc-900"}`}>{titulo}</p>
                              <span className={`text-xs flex items-center gap-1 mt-0.5 ${selected ? "text-white/80" : "text-zinc-400"}`}>
                                <Clock size={11} /> {formatDuration(duracion)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {precio != null && precio !== "" && Number(precio) !== 0 && (
                                <span className={`font-bold text-sm px-2 py-0.5 rounded-lg ${selected ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-900"}`}>
                                  ${precio}
                                </span>
                              )}
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected ? "border-white bg-white" : "border-zinc-300"}`}>
                                {selected && <CheckCircle size={12} style={{ color: brandColor }} />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {selectedServices.length > 0 && (
                      <button onClick={() => setBookingStep(2)}
                        className={`w-full py-3 text-white font-bold mt-2 ${btnRadius}`}
                        style={{ backgroundColor: brandColor }}>
                        Continuar con {selectedServices.length} servicio{selectedServices.length > 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                )}

                {/* ── Paso 2: Profesional ── */}
                {bookingStep === 2 && (
                  <div className="space-y-4">
                    <button onClick={() => setBookingStep(1)} className="text-xs text-zinc-400 flex items-center gap-1">
                      <ChevronLeft size={14} /> Volver
                    </button>
                    <h4 className="font-bold text-lg text-zinc-900">¿Con quién te querés atender?</h4>

                    {equipoFiltrado.length === 0 ? (
                      <button onClick={() => { setBookingData(p => ({ ...p, worker: null })); setBookingStep(3); }}
                        className={`w-full py-3 text-white font-bold ${btnRadius}`}
                        style={{ backgroundColor: brandColor }}>Continuar</button>
                    ) : (
                      <>
                        <button onClick={() => { setBookingData(p => ({ ...p, worker: null })); setBookingStep(3); }}
                          className={`w-full p-4 border border-zinc-200 text-left hover:border-zinc-400 transition-all flex items-center gap-3 ${inputRadius}`}>
                          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                            <Users size={18} className="text-zinc-400" />
                          </div>
                          <span className="font-medium text-zinc-700">Sin preferencia</span>
                        </button>
                        {equipoFiltrado.map((w: any, i: number) => (
                          <button key={w.id || i}
                            onClick={() => { setBookingData(p => ({ ...p, worker: w })); setBookingStep(3); }}
                            className={`w-full p-4 border border-zinc-200 text-left hover:border-zinc-400 transition-all flex items-center gap-3 ${inputRadius}`}>
                            {w.imagenUrl || w.photoUrl ? (
                              <img src={w.imagenUrl || w.photoUrl} className="w-10 h-10 rounded-full object-cover" alt={w.nombre} />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                                <User size={18} className="text-zinc-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-zinc-900">{w.nombre}</p>
                              <p className="text-xs text-zinc-400">{w.cargo || w.role}</p>
                            </div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}

                {/* ── Paso 3: Fecha y hora ── */}
                {bookingStep === 3 && (
                  <div className="space-y-4">
                    <button onClick={() => setBookingStep(2)} className="text-xs text-zinc-400 flex items-center gap-1">
                      <ChevronLeft size={14} /> Volver
                    </button>
                    <h4 className="font-bold text-lg text-zinc-900">Elegí fecha y hora</h4>

                    <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 text-xs text-zinc-600">
                      <p className="font-bold mb-1">{selectedServices.map(s => s.titulo || s.name).join(" + ")}</p>
                      <p className="flex items-center gap-1 text-zinc-400"><Clock size={11} /> {formatDuration(totalDuration)}</p>
                    </div>

                    <input type="date" min={new Date().toISOString().split("T")[0]}
                      value={bookingData.date}
                      onChange={e => setBookingData(p => ({ ...p, date: e.target.value, time: "" }))}
                      className={`w-full p-3 border border-zinc-200 outline-none focus:border-zinc-400 text-zinc-900 bg-white ${inputRadius}`}
                    />

                    {bookingData.date && (
                      loadingSlots ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-zinc-400" /></div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                          {generateSlots().length === 0 ? (
                            <p className="col-span-3 text-center text-zinc-400 text-sm py-4">No hay turnos disponibles este día.</p>
                          ) : generateSlots().map(slot => (
                            <button key={slot} onClick={() => setBookingData(p => ({ ...p, time: slot }))}
                              className={`py-2 text-sm font-medium border transition-all ${inputRadius} ${
                                bookingData.time === slot
                                  ? "text-white border-transparent"
                                  : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-400"
                              }`}
                              style={bookingData.time === slot ? { backgroundColor: brandColor } : {}}>
                              {slot}
                            </button>
                          ))}
                        </div>
                      )
                    )}

                    {bookingData.date && bookingData.time && (
                      <button onClick={() => setBookingStep(4)}
                        className={`w-full py-3 text-white font-bold ${btnRadius}`}
                        style={{ backgroundColor: brandColor }}>
                        Continuar
                      </button>
                    )}
                  </div>
                )}

                {/* ── Paso 4: Datos del cliente ── */}
                {bookingStep === 4 && (
                  <div className="space-y-4">
                    <button onClick={() => setBookingStep(3)} className="text-xs text-zinc-400 flex items-center gap-1">
                      <ChevronLeft size={14} /> Volver
                    </button>
                    <h4 className="font-bold text-lg text-zinc-900">Tus datos</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Nombre" value={bookingData.clientName}
                        onChange={e => setBookingData(p => ({ ...p, clientName: e.target.value }))}
                        className={`w-full p-3 border border-zinc-200 outline-none focus:border-zinc-400 text-zinc-900 bg-white ${inputRadius}`}
                      />
                      <input placeholder="Apellido" value={bookingData.clientLastName}
                        onChange={e => setBookingData(p => ({ ...p, clientLastName: e.target.value }))}
                        className={`w-full p-3 border border-zinc-200 outline-none focus:border-zinc-400 text-zinc-900 bg-white ${inputRadius}`}
                      />
                    </div>
                    <input type="email" placeholder="Email" value={bookingData.clientEmail}
                      onChange={e => setBookingData(p => ({ ...p, clientEmail: e.target.value }))}
                      className={`w-full p-3 border border-zinc-200 outline-none focus:border-zinc-400 text-zinc-900 bg-white ${inputRadius}`}
                    />
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-400 uppercase">Teléfono</label>
                      <div className="flex gap-2">
                        {/* Selector de país */}
                        <select
                          value={bookingData.clientCountryCode}
                          onChange={e => setBookingData(p => ({ ...p, clientCountryCode: e.target.value }))}
                          className={`w-[105px] shrink-0 p-3 border border-zinc-200 outline-none focus:border-zinc-400 text-zinc-900 bg-white text-sm ${inputRadius}`}
                        >
                          {COUNTRY_CODES.map(c => (
                            <option key={c.code + c.name} value={c.code}>
                              {c.flag} {c.code}
                            </option>
                          ))}
                        </select>
                        
                        {/* Input de código de área */}
                        <input placeholder="Área"
                          value={bookingData.clientAreaCode}
                          onChange={e => setBookingData(p => ({ ...p, clientAreaCode: e.target.value }))}
                          className={`w-20 p-3 border border-zinc-200 outline-none focus:border-zinc-400 text-zinc-900 bg-white ${inputRadius}`}
                        />
                        
                        {/* Input de número local */}
                        <input placeholder="Número local"
                          value={bookingData.clientLocalNumber}
                          onChange={e => setBookingData(p => ({ ...p, clientLocalNumber: e.target.value }))}
                          className={`flex-1 p-3 border border-zinc-200 outline-none focus:border-zinc-400 text-zinc-900 bg-white ${inputRadius}`}
                        />
                      </div>
                    </div>

                    {/* FIX #8: Mensaje e imágenes solo si requireManualConfirmation */}
                    {requireManual && (
                      <>
                        <textarea placeholder="Mensaje o aclaración (opcional)" value={bookingData.message}
                          onChange={e => setBookingData(p => ({ ...p, message: e.target.value }))}
                          rows={3}
                          className={`w-full p-3 border border-zinc-200 outline-none focus:border-zinc-400 resize-none text-zinc-900 bg-white ${inputRadius}`}
                        />
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-zinc-700 flex items-center gap-1">
                            <ImageIcon size={14} /> Adjuntar imágenes (opcional)
                          </label>
                          <input type="file" multiple accept="image/*"
                            disabled={uploadingImages}
                            onChange={handleImageUpload}
                            className="w-full text-sm text-zinc-500 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 disabled:opacity-50 cursor-pointer"
                          />
                          {uploadingImages && (
                            <p className="text-xs text-zinc-400 animate-pulse flex items-center gap-1">
                              <Loader2 size={12} className="animate-spin" /> Subiendo imágenes...
                            </p>
                          )}
                          {bookingData.images.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {bookingData.images.map((url, i) => (
                                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-200">
                                  <img src={url} className="w-full h-full object-cover" alt="" />
                                  <button onClick={() => setBookingData(p => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }))}
                                    className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl-lg">
                                    <X size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    <button onClick={handleSubmit}
                      disabled={!bookingData.clientName || !bookingData.clientLastName || !bookingData.clientEmail || enviando || uploadingImages}
                      className={`w-full py-3.5 text-white font-bold flex items-center justify-center gap-2 ${btnRadius} disabled:opacity-50`}
                      style={{ backgroundColor: brandColor }}>
                      {enviando
                        ? <Loader2 size={18} className="animate-spin" />
                        : uploadingImages
                        ? "Subiendo fotos..."
                        : <><CheckCircle size={18} /> {requireManual ? "Enviar solicitud" : "Confirmar Turno"}</>}
                    </button>

                    <p className="text-center text-xs text-zinc-400">
                      {requireManual
                        ? "El negocio recibirá tu solicitud y te confirmará el turno."
                        : "Tu turno será agendado automáticamente."}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}