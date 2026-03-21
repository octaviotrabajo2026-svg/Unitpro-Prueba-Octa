"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { 
  Users, LayoutDashboard, LogOut, Star, MessageCircle, 
  CreditCard, Settings, Link as LinkIcon, Check, 
  Calendar as CalendarIcon, UserCheck, Clock, ChevronLeft, ChevronRight, User, Eye, EyeOff,
  Mail,
  X,
  Menu,  Calendar, ChevronDown, ChevronUp, Briefcase, ExternalLink,
  Phone,
  Bell,Tag,Trash2,MoreVertical, Edit,Minus, Plus,
  Puzzle
} from "lucide-react";
import { approveAppointment, cancelAppointment, markDepositPaid } from "@/app/actions/confirm-booking/manage-appointment";
import { BotonCancelar } from "@/components/BotonCancelar";
import MarketingCampaign from "@/components/dashboards/MarketingCampaign";
import BlockTimeManager from "@/components/dashboards/BlockTimeManager";
import { PasswordManager } from "@/components/dashboards/PasswordManager";
import ManualBookingManager from "./ManualBookingManager";
import { rescheduleBooking, cancelBooking } from "@/app/actions/service-booking/calendar-actions";
import DomainManager from "@/components/dashboards/DomainManager";
import { Palette } from "lucide-react";
import WebEditor from "@/app/[slug]/dashboard/WebEditor";
import BlockMarketplace from "@/components/dashboards/BlockMarketplace";

// --- CONFIGURACIÓN ---
const CONST_LINK_MP = "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=TU_ID_DE_PLAN"; 

export default function ConfirmBookingDashboard({ initialData }: { initialData: any }) {
  const [negocio, setNegocio] = useState(initialData); // Usamos el negocio que nos pasa el Factory
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [turnos, setTurnos] = useState<any[]>([]);
  const handleTurnoCancelado = (idEliminado: string) => {
    setTurnos((prev) => prev.filter((t) => t.id !== idEliminado));
    };
  const [resenas, setResenas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"resumen" | "calendario" | "clientes"| "solicitudes" | "resenas" | "suscripcion" | "configuracion" | "marketing"| "promociones" | "gestion_turnos" | "editar_web">("resumen");
  const [contactModal, setContactModal] = useState({ show: false, clientEmail: '', clientName: '' });
  const [mailContent, setMailContent] = useState({ subject: '', message: '' });
  const [isSending, setIsSending] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{show: boolean, turnoId: string | null}>({ show: false, turnoId: null });
  const [priceInput, setPriceInput] = useState("");
  const [durationInput, setDurationInput] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [filtroTrabajador, setFiltroTrabajador] = useState<string>("Todos");

  const [rescheduleModal, setRescheduleModal] = useState({ show: false, turnoId: '', currentStart: '' });
  const [newDate, setNewDate] = useState('');
  const [showEditor, setShowEditor] = useState(false);

  // NUEVO: Función para guardar la reprogramación
  const handleRescheduleSave = async () => {
    if (!newDate) return alert("Selecciona una fecha válida");
    
    // Indicador visual simple
    const btn = document.getElementById('btn-save-reschedule');
    if(btn) btn.innerText = "Guardando...";

    // Usamos la Server Action compartida
    const res = await rescheduleBooking(rescheduleModal.turnoId, new Date(newDate).toISOString());

    if (!res.success) {
        alert("Error al reprogramar: " + res.error);
        if(btn) btn.innerText = "Guardar";
    } else {
        // Actualizamos estado local
        setTurnos(prev => prev.map(t => t.id === rescheduleModal.turnoId ? { ...t, fecha_inicio: newDate } : t));
        setRescheduleModal({ ...rescheduleModal, show: false });
        alert("Turno reprogramado y actualizado en Google Calendar.");
    }
  };
  

  const fetchDashboardData = useCallback(async () => {

    const { data: datosNegocio, error } = await supabase
        .from('negocios')
        .select('*')
        .eq('id', initialData.id) // Usamos initialData.id porque es constante
        .single();
    
    if (datosNegocio) {
          // CORRECCIÓN CRÍTICA: Aseguramos que config_web sea un objeto
          // A veces Supabase cliente lo devuelve como string JSON
          if (typeof datosNegocio.config_web === 'string') {
              try {
                  datosNegocio.config_web = JSON.parse(datosNegocio.config_web);
              } catch (e) {
                  console.error("Error al parsear config_web", e);
                  // Si falla, intentamos mantener el anterior o un objeto vacío
                  datosNegocio.config_web = negocio.config_web || {}; 
              }
          }
          setNegocio(datosNegocio);
      } else if (error) {
          console.error("Error fetching negocio:", error);
      }
    // 1. Cargar Reseñas
    const { data: datosResenas } = await supabase
      .from("resenas")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order('created_at', { ascending: false });
    if (datosResenas) {
        setResenas(datosResenas); // Para el promedio (arriba)
        setReviews(datosResenas); // <--- AGREGAR ESTO (Para la lista visual)
    }

    // 2. CARGAR TURNOS Y FILTRAR CLIENTES
    const { data: datosTurnos } = await supabase
      .from("turnos")
      .select("*")
      .eq("negocio_id", negocio.id)
      .neq('estado', 'cancelado')
      .order('fecha_inicio', { ascending: false }); // Mantenemos orden descendente
      
    if (datosTurnos) {
      setTurnos(datosTurnos); 

      // Mantenemos la lógica de Clientes Únicos (Leads)
      const clientesUnicos = datosTurnos.filter((obj: any, index: number, self: any[]) =>
          index === self.findIndex((t: any) => (
              t.cliente_email?.trim().toLowerCase() === obj.cliente_email?.trim().toLowerCase() && t.cliente_email
          ))
      );
      
      setLeads(clientesUnicos);
    }
  }, [negocio.id, supabase]);
  // --- LÓGICA DE DATOS ESPECÍFICOS ---
  useEffect(() => {
    async function init() {
      setLoading(true);

      // Redirección de Google (se mantiene intacta)
      if (searchParams.get('google_connected') === 'true') {
        setActiveTab("calendario"); 
        router.replace(window.location.pathname, { scroll: false });
      }

      // Llamamos a nuestra función de datos
      await fetchDashboardData();
      
      setLoading(false);
    }
    init();
  }, [searchParams, router, fetchDashboardData]);

  useEffect(() => {
    if (negocio?.config_web?.metadata?.title) {
      document.title = `${negocio.config_web.metadata.title} - Dashboard`;
    }
    
    // Buscar favicon de config web, logo general, o nada.
    const faviconUrl = negocio?.config_web?.metadata?.faviconUrl || negocio?.config_web?.logoUrl || negocio?.logo_url;
    if (faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [negocio]);
    

 // Se ejecuta cuando carga el negocio
    const toggleVisibility = async (id: string, currentStatus: boolean) => {
    // 1. Actualizar en Supabase
    const { error } = await supabase
        .from('resenas')
        .update({ visible: !currentStatus })
        .eq('id', id);

    // 2. Actualizar visualmente en local (para que sea instantáneo)
    if (!error) {
        setReviews(prev => prev.map(r => r.id === id ? { ...r, visible: !currentStatus } : r));
    } else {
        alert("Error al actualizar: " + error.message);}};


  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleSendDirectEmail = async () => {
    setIsSending(true);
    try {
        const res = await fetch('/api/google/send-email', {
        method: 'POST',
        body: JSON.stringify({
            to: contactModal.clientEmail,
            subject: mailContent.subject,
            message: mailContent.message,
            negocioId: initialData.id // ID del negocio dueño del dashboard
        })
        });
        
        if (res.ok) {
        alert("Email enviado correctamente");
        setContactModal({ ...contactModal, show: false });
        } else {
        alert("Error al enviar. ¿Tienes Gmail conectado?");
        }
    } catch (err) {
        console.error(err);
    } finally {
        setIsSending(false);
    }
  };

  const handleConnectGoogle = () => {
    if (!negocio?.slug) return;
    window.location.href = `/api/google/auth?slug=${negocio.slug}`;
  };

  const onPreConfirm = (id: string, precioBase: number | string = "", duracionBase: number | string = "") => {
      setConfirmModal({ show: true, turnoId: id });
      setPriceInput(precioBase ? String(precioBase) : ""); // Pre-cargamos el valor
      setDurationInput(duracionBase ? String(duracionBase) : "");
  };


  const handleConfirmAction = async () => {
      if (!confirmModal.turnoId) return;
      
      setIsConfirming(true);
      
      // CORRECCIÓN: Ahora pasamos el precio convertido a número
      const finalPrice = priceInput ? Number(priceInput) : 0;
      const finalDuration = durationInput ? Number(durationInput) : undefined;
      const res = await approveAppointment(confirmModal.turnoId, finalPrice, finalDuration);
      
      if (!res.success) {
          alert("Error: " + res.error);
      } else {
        // SOFT REFRESH: Actualizamos los datos sin recargar la página
        await fetchDashboardData();
      }
      
      setIsConfirming(false);
      setConfirmModal({ show: false, turnoId: null });
  };

  const regularServices = negocio.config_web?.servicios?.items?.map((s: any) => ({ 
      ...s, 
      name: s.titulo 
  })) || [];
  const promoServices = negocio.config_web?.services || [];
  const allServices = [...regularServices, ...promoServices];
  let configWebSeguro = negocio?.config_web || {};
  if (typeof configWebSeguro === 'string') {
      try { configWebSeguro = JSON.parse(configWebSeguro); } catch(e) { configWebSeguro = {}; }
  }

  let mostrarSolicitudes = true;

  if (configWebSeguro.booking) {
      const pideSena = configWebSeguro.booking.requestDeposit === true || configWebSeguro.booking.requestDeposit === "true";
      const pideManual = configWebSeguro.booking.requireManualConfirmation === true || configWebSeguro.booking.requireManualConfirmation === "true";
      
      if (!pideSena && !pideManual) {
          mostrarSolicitudes = false; // Este es el único caso donde se oculta
      }
  }
  if (turnos.some((t: any) => t.estado === 'pendiente' || t.estado === 'esperando_senia')) {
      mostrarSolicitudes = true;
  }



  const menuItems = [
    { id: "resumen", label: "General", icon: <LayoutDashboard size={18} /> },
    { 
      id: "calendario", 
      label: "Calendario", 
      icon: <CalendarIcon size={18} />, 
      badge: !negocio.google_calendar_connected ? "!" : undefined 
    },
    { id: "clientes", label: "Clientes", icon: <UserCheck size={18} /> },
    
    ...(mostrarSolicitudes ? [{ 
        id: "solicitudes", 
        label: "Solicitudes", 
        icon: <Bell size={18} />, 
        badge: turnos.filter((t: any) => t.estado === 'pendiente').length > 0 
                ? turnos.filter((t: any) => t.estado === 'pendiente').length 
                : undefined 
    }] : []),
    { 
      id: "resenas", 
      label: "Reseñas", 
      icon: <MessageCircle size={18} />, 
      badge: resenas.length > 0 ? resenas.length : undefined 
    },
    { id: "suscripcion", label: "Suscripción", icon: <CreditCard size={18} /> },
    { id: "promociones", label: "Promociones", icon: <Tag size={18} /> },
    { id: "gestion_turnos", label: "Gestión de Turnos", icon: <Calendar size={18} /> },
    { id: "marketing", label: "Marketing", icon: <LinkIcon size={18} /> },
    ...(negocio.editor_enabled ? [{ 
        id: "editar_web", 
        label: "Personalizar Web", 
        icon: <Palette size={18} className="text-indigo-600" /> 
    }] : []),

    { id: "configuracion", label: "Configuración", icon: <Settings size={18} /> },
  ];

  if (loading) return (
    <div className="h-full w-full flex items-center justify-center bg-white min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"/>
        </div>
    </div>
  );

  // CÁLCULOS ESTADÍSTICOS
  const promedio = resenas.length > 0
    ? (resenas.reduce((acc, curr) => acc + curr.puntuacion, 0) / resenas.length).toFixed(1)
    : "0.0";
  const totalReviews = resenas.length;

  if (loading) return (
    <div className="h-full w-full flex items-center justify-center bg-white min-h-[500px]">
        <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"/>
            <p className="text-zinc-400 text-sm animate-pulse">Cargando datos del negocio...</p>
        </div>
    </div>
  );

  const equipo = negocio.config_web?.equipo?.members || negocio.config_web?.equipo?.items || [];
  const nombresTrabajadores = equipo.map((m: any) => m.name || m.nombre).filter(Boolean);

  const turnoPasaFiltro = (t: any) => {
      if (filtroTrabajador === "Todos") return true;
      const workerNameFromService = typeof t.servicio === 'string' && t.servicio.includes(" - ") 
          ? t.servicio.split(" - ")[1].trim() 
          : "";
      const tWorker = t.worker_name?.trim() || workerNameFromService;
      return tWorker === filtroTrabajador;
  };
  



  return (
    // 1. CONTENEDOR PRINCIPAL: 
    // - En móvil: 'flex-col' (uno debajo del otro)
    // - En escritorio: 'md:flex-row' (uno al lado del otro)
    <div className="min-h-screen bg-[#eee9dd] flex flex-col lg:flex-row font-sans text-zinc-900 overflow-hidden">
      
      {/* --- 2. NAVBAR MÓVIL (Solo visible en md:hidden) --- */}
      {/* Usamos h-16 (64px) fijo para poder calcular el top del menú después */}
      <div className="lg:hidden bg-[#eee9dd] border-b border-zinc-200 h-16 px-4 flex justify-between items-center sticky top-0 z-40 shadow-sm shrink-0">
         <div className="flex items-center gap-2">
            {(negocio.config_web?.metadata?.faviconURL || negocio?.config_web?.logoUrl) ? (
                <img src={negocio.config_web?.metadata?.faviconURL || negocio.config_web?.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-md" />
            ) : (
                <div className="w-8 h-8 bg-zinc-900 rounded-md flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {negocio.nombre ? negocio.nombre.substring(0,1) : "N"}
                </div>
            )}
            <span className="font-bold tracking-tight text-sm truncate max-w-[150px]">{negocio.config_web?.hero?.titulo || negocio.nombre}</span>
         </div>
         <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg active:scale-95 transition-transform">
            {mobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
         </button>
      </div>

      {/* --- 3. MENÚ DESPLEGABLE MÓVIL (Overlay) --- */}
      {/* Se posiciona 'fixed' justo debajo del navbar (top-16) */}
      {mobileMenuOpen && (
        <>
            {/* Fondo oscuro transparente para cerrar al hacer click fuera */}
            <div className="lg:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-sm top-16" onClick={() => setMobileMenuOpen(false)} />
            
            {/* El menú en sí */}
            <div className="lg:hidden fixed top-16 left-0 w-full bg-white z-40 border-b border-zinc-200 shadow-2xl p-2 flex flex-col gap-1 animate-in slide-in-from-top-2 duration-200">
                {menuItems.map((item) => (
                    <button 
                        key={item.id}
                        onClick={() => {
                            setActiveTab(item.id as any);
                            setMobileMenuOpen(false);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all ${activeTab === item.id ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
                    >
                        {/* Clonamos icono para forzar color si está activo */}
                        {activeTab === item.id ? <div className="text-white">{item.icon}</div> : item.icon}
                        <span>{item.label}</span>
                        {item.badge && (
                        <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badge === '!' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                            {item.badge}
                        </span>
                        )}
                    </button>
                ))}
                <div className="h-px bg-zinc-100 my-1"></div>
                <button onClick={handleLogout} className="flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium w-full text-left">
                    <LogOut size={18}/> Cerrar Sesión
                </button>
            </div>
        </>
      )}

      {/* --- SIDEBAR DE ESCRITORIO (MODIFICADO PARA USAR menuItems) --- */}
      <aside className="w-64 bg-[#eee9dd] border-r border-zinc-200 hidden lg:flex flex-col sticky top-0 h-screen z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 px-2 mb-8">
            {(negocio.config_web?.metadata?.faviconURL || negocio?.config_web?.logoUrl) ? (
                <img src={negocio.config_web?.metadata?.faviconURL || negocio.config_web?.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-md" />
            ) : (
                <div className="w-8 h-8 bg-zinc-900 rounded-md flex items-center justify-center text-white font-bold shrink-0">
                    {negocio.nombre ? negocio.nombre.substring(0,1) : "N"}
                </div>
            )}
            <span className="font-bold tracking-tight truncate">{negocio.config_web?.hero?.titulo || negocio.nombre}</span>
          </div>

          <nav className="space-y-1">
            {/* Mapeamos los mismos items para el escritorio */}
            {menuItems.map((item) => (
                <SidebarItem 
                    key={item.id}
                    icon={item.icon} 
                    label={item.label} 
                    active={activeTab === item.id} 
                    onClick={() => setActiveTab(item.id as any)} 
                    badge={item.badge}
                />
            ))}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-zinc-100">
            <button onClick={handleLogout} className="flex items-center gap-2 text-zinc-400 hover:text-red-600 text-sm font-medium transition-colors w-full px-2">
                <LogOut size={16} /> Cerrar Sesión
            </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto p-6 lg:p-10">
            
            {/* --- TAB: RESUMEN (HOME) --- */}
            {activeTab === "resumen" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <header className="mb-8">
                        <h1 className="text-2xl font-bold tracking-tight mb-1">Buenos días, {negocio.nombre}</h1>
                        <p className="text-zinc-500 text-sm">Resumen de actividad y próximos eventos.</p>
                    </header>

                    {/* KPI GRID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <StatCard 
                            title="Total Clientes" 
                            value={turnos.length} 
                            icon={<Users className="text-blue-600" size={20}/>}
                            trend="Base de datos"
                            trendPositive={true}
                        />
                        <StatCard 
                            title="Calificación Global" 
                            value={promedio} 
                            icon={<Star className="text-yellow-500" size={20} fill="currentColor"/>}
                            subtext={`Basado en ${totalReviews} reseñas totales`}
                        />
                        <StatCard 
                            title="Próximos Turnos" 
                            value={turnos.filter(t => new Date(t.fecha_inicio) > new Date()).length} 
                            icon={<CalendarIcon className="text-purple-600" size={20}/>}
                            subtext="Sincronizados con Google Calendar"
                        />
                    </div>
                </div>
            )}

            {/* --- TAB: CALENDARIO --- */}
            {activeTab === "calendario" && (
                <CalendarTab 
                    negocio={negocio} 
                    turnos={turnos.filter((t: any) => t.estado !== 'cancelado')} 
                    handleConnectGoogle={handleConnectGoogle}
                    onCancel={handleTurnoCancelado}
                    onContact={(email: string, name: string) => setContactModal({ show: true, clientEmail: email, clientName: name })}
                    onReschedule={(id: string, start: string) => {
                        setRescheduleModal({ show: true, turnoId: id, currentStart: start });
                        // Formato para input datetime-local
                        const dateObj = new Date(start);
                        dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());
                        setNewDate(dateObj.toISOString().slice(0, 16));
                    }}
                />
            )}
            {/* --- TAB: PROMOCIONES --- */}
            {activeTab === "promociones" && (
            <PromotionsTab initialConfig={negocio.config_web} negocioId={negocio.id} />
            )}

            {/* --- OTRAS TABS --- */}
            {activeTab === "clientes" && <div className="animate-in fade-in"><h1 className="text-2xl font-bold mb-4">Base de Clientes</h1><ClientesTable turnos={turnos} setContactModal={setContactModal} /></div>}
            {activeTab === "solicitudes" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
                    <header className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight mb-1">Centro de Solicitudes</h1>
                            <p className="text-zinc-500 text-sm">Gestiona pagos pendientes y nuevas reservas.</p>
                        </div>
                        {nombresTrabajadores.length > 0 && (
                            <div className="flex items-center gap-2">
                                <label className="text-sm font-bold text-zinc-500">Filtrar por:</label>
                                <select 
                                    className="p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
                                    value={filtroTrabajador}
                                    onChange={(e) => setFiltroTrabajador(e.target.value)}
                                >
                                    <option value="Todos">Todos</option>
                                    {nombresTrabajadores.map((nombre: string, idx: number) => (
                                        <option key={idx} value={nombre}>{nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </header>

                    {/* --- ZONA 1: ESPERANDO SEÑA (Naranja) --- */}
                    {/* Estos turnos NO están en Google Calendar aún */}
                    {turnos.some(t => t.estado === 'esperando_senia' && turnoPasaFiltro(t)) && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-orange-600 uppercase tracking-wide flex items-center gap-2 bg-orange-50 w-fit px-3 py-1 rounded-full border border-orange-100">
                                <Clock size={14} /> Esperando Pago de Seña
                            </h3>
                            <div className="grid gap-4">
                                {turnos.filter(t => t.estado === 'esperando_senia' && turnoPasaFiltro(t)).map((t) => (
                                    <div key={t.id} className="bg-white p-5 rounded-2xl border border-orange-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
                                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500"></div>
                                        <div className="flex-1 pl-2">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="font-bold text-lg text-zinc-900">{t.cliente_nombre}</span>
                                                <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-full uppercase">Nuevo</span>
                                                
                                                {/* NUEVO BOTÓN DE WHATSAPP */}
                                                {t.cliente_telefono && (
                                                    <a 
                                                        href={`https://wa.me/${t.cliente_telefono.replace(/\D/g, '')}`}
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="ml-1 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors"
                                                        title="Contactar por WhatsApp"
                                                    >
                                                        <MessageCircle size={14} />
                                                        WhatsApp
                                                    </a>
                                                )}
                                            </div>
                                            <p className="text-zinc-600 text-sm font-medium">{t.servicio}</p>
                                            <div className="flex gap-4 mt-2 text-xs text-zinc-400">
                                                <span className="flex items-center gap-1"><CalendarIcon size={14}/> {new Date(t.fecha_inicio).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1"><Clock size={14}/> {new Date(t.fecha_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}hs</span>
                                            </div>
                                            <p className="text-[10px] text-orange-600 mt-2 font-bold">⚠️ No agendado en Google Calendar todavía.</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={async () => {
                                                    if(confirm("¿Confirmar que llegó el pago? Esto intentará reservar el lugar en Google Calendar.")) {
                                                        const res = await markDepositPaid(t.id);
                                                        if(!res.success) {
                                                            alert(res.error);
                                                        } else {
                                                            // SOFT REFRESH AQUÍ
                                                            await fetchDashboardData();
                                                        }
                                                    } 
                                                }}
                                                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl transition-colors text-sm flex items-center gap-2 shadow-lg shadow-orange-200"
                                            >
                                                <CreditCard size={16}/> Registrar Pago
                                            </button>
                                            <button 
                                                onClick={async () => { if(confirm("¿Cancelar turno?")) await cancelAppointment(t.id); await fetchDashboardData(); }}
                                                className="px-3 py-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                                            >
                                                <X size={20}/>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="h-px bg-zinc-200 my-6"></div>
                        </div>
                    )}

                    {/* --- ZONA 2: NUEVAS SOLICITUDES (Gris/Blanco) --- */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-2 px-1">
                             Nuevas Solicitudes ({turnos.filter(t => t.estado === 'pendiente' && turnoPasaFiltro(t)).length})
                        </h3>
                        
                        {turnos.filter(t => t.estado === 'pendiente' && turnoPasaFiltro(t)).length === 0 ? (
                            <div className="py-12 text-center bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-200">
                                <p className="text-zinc-400 text-sm">No hay nuevas solicitudes pendientes.</p>
                            </div>
                        ) : (
                            turnos.filter(t => t.estado === 'pendiente' && turnoPasaFiltro(t)).map((t) => (
                                <div key={t.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div className="flex-1">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="font-bold text-lg text-zinc-900">{t.cliente_nombre}</span>
                                                <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded-full uppercase">Nuevo</span>
                                                
                                                {/* NUEVO BOTÓN DE WHATSAPP */}
                                                {t.cliente_telefono && (
                                                    <a 
                                                        href={`https://wa.me/${t.cliente_telefono.replace(/\D/g, '')}`}
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="ml-1 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-colors"
                                                        title="Contactar por WhatsApp"
                                                    >
                                                        <MessageCircle size={14} />
                                                        WhatsApp
                                                    </a>
                                                )}
                                            </div>
                                            <p className="text-zinc-600 text-sm font-medium">{t.servicio}</p>
                                            <div className="flex flex-wrap gap-4 mt-3 text-xs text-zinc-400 font-mono">
                                                <span className="flex items-center gap-1"><CalendarIcon size={14}/> {new Date(t.fecha_inicio).toLocaleDateString()}</span>
                                                <span className="flex items-center gap-1"><Clock size={14}/> {new Date(t.fecha_inicio).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}hs</span>
                                            </div>
                                            {(t.mensaje || (t.fotos && t.fotos.length > 0)) && (
                                                <div className="mt-2 p-4 bg-zinc-50 rounded-xl border border-zinc-100 space-y-4">
                                                    {t.mensaje && <p className="text-sm text-zinc-700 italic">"{t.mensaje}"</p>}
                                                    {t.fotos && t.fotos.length > 0 && (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-[10px] font-bold text-zinc-400 uppercase">Archivos Adjuntos:</span>
                                                            <div className="flex gap-2 flex-wrap">
                                                                {t.fotos.map((url: string, index: number) => (
                                                                    <a 
                                                                        key={index} 
                                                                        href={url} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="relative w-16 h-16 rounded-lg overflow-hidden border border-zinc-200 shadow-sm hover:ring-2 hover:ring-indigo-500 transition-all group"
                                                                        title="Ver imagen completa"
                                                                    >
                                                                        <img 
                                                                            src={url} 
                                                                            alt={`Adjunto ${index + 1}`} 
                                                                            className="w-full h-full object-cover" 
                                                                        />
                                                                        {/* Icono overlay al pasar mouse */}
                                                                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                                            <button 
                                                onClick={async () => {
                                                    if(confirm("¿Rechazar esta solicitud?")) {
                                                        const res = await cancelAppointment(t.id);
                                                        if (res.success) {
                                                            // SOFT REFRESH AQUÍ
                                                            await fetchDashboardData(); 
                                                        } else {
                                                            alert("Error al rechazar: " + res.error);
                                                        }
                                                    }
                                                }}
                                                className="flex-1 md:flex-none px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors text-sm"
                                            >
                                                Rechazar
                                            </button>
                                            {/* Abre el Modal de Precio. Al confirmar ahí, llama a approveAppointment */}
                                            <button 
                                                onClick={() => {
                                                    // Calculamos duración actual en minutos
                                                    const dur = Math.round((new Date(t.fecha_fin).getTime() - new Date(t.fecha_inicio).getTime()) / 60000);
                                                    onPreConfirm(t.id, t.precio_total || 0, dur);
                                                }}
                                                className="..."
                                            >
                                                <Check size={16}/> Aceptar
                                            </button>
                                        </div>
                                    </div>
                            ))
                        )}
                    </div>
                </div>
            )}
            {activeTab === "resenas" && <ReviewsTab resenas={reviews} onToggle={toggleVisibility}/>}
            {activeTab === "suscripcion" && <SubscriptionTab negocio={negocio} CONST_LINK_MP={CONST_LINK_MP} />}
            {activeTab === "gestion_turnos" && (
                <div className="space-y-12 animate-in fade-in">
                    <header>
                        <h1 className="text-2xl font-bold">Gestión de Turnos y Horarios</h1>
                        <p className="text-zinc-500 text-sm">Agenda turnos manuales o bloquea horarios por feriados/vacaciones.</p>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        {/* 1. Agendamiento Manual */}
                        <ManualBookingManager 
                            slug={negocio.slug} 
                            workers={negocio.config_web?.equipo?.members || negocio.config_web?.equipo?.items || []} 
                            services={allServices}
                        />

                        {/* 2. Bloqueos (Reutilizamos el componente que ya tenías) */}
                        <BlockTimeManager 
                            slug={negocio.slug} 
                            workers={negocio.config_web?.equipo?.members || negocio.config_web?.equipo?.items || []} 
                        />
                    </div>
                </div>
            )}
            {activeTab === "editar_web" && (
                <div className="flex flex-col items-center justify-center h-[400px] bg-white rounded-2xl border border-dashed border-zinc-200">
                    <Palette size={48} className="text-zinc-300 mb-4" />
                    <h2 className="text-xl font-bold">Editor de Sitio Web</h2>
                    <p className="text-zinc-500 mb-6">Haz clic abajo para comenzar a editar tu página.</p>
                    <button 
                        onClick={() => setShowEditor(true)}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all"
                    >
                        Abrir Editor Pro
                    </button>
                </div>
            )}
            {activeTab === "marketing" && <MarketingCampaign negocio={negocio} />}
            
            {activeTab === "configuracion" && <ConfigTab negocio={negocio} handleConnectGoogle={handleConnectGoogle} />}


            
        </div>
        {/* MODAL REPROGRAMAR (NUEVO) */}
        {rescheduleModal.show && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                    <h3 className="text-lg font-bold mb-4">Reprogramar Turno</h3>
                    <p className="text-sm text-zinc-500 mb-2">Selecciona la nueva fecha y hora:</p>
                    <input 
                        type="datetime-local"
                        className="w-full p-2 border rounded-lg mb-6 outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <button onClick={() => setRescheduleModal({ ...rescheduleModal, show: false })} className="flex-1 py-2 text-gray-600 font-medium">Cancelar</button>
                        <button id="btn-save-reschedule" onClick={handleRescheduleSave} className="flex-1 py-2 bg-zinc-900 text-white rounded-lg font-bold hover:bg-zinc-800">Guardar</button>
                    </div>
                </div>
            </div>
        )}


        {/* CONTACT MODAL */}
        {contactModal.show && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
              <h3 className="text-lg font-bold mb-1">Enviar email a {contactModal.clientName}</h3>
              <p className="text-sm text-gray-500 mb-4">Desde tu cuenta de Gmail conectada</p>
              
              <div className="space-y-4">
                <input 
                  placeholder="Asunto"
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  onChange={e => setMailContent({...mailContent, subject: e.target.value})}
                />
                <textarea 
                  placeholder="Escribe tu mensaje..."
                  rows={5}
                  className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  onChange={e => setMailContent({...mailContent, message: e.target.value})}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setContactModal({ ...contactModal, show: false })}
                  className="flex-1 py-2 text-gray-600 font-medium"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSendDirectEmail}
                  disabled={isSending}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {isSending ? "Enviando..." : "Enviar Email"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* MODAL DE CONFIRMACIÓN DE PRECIO */}
        {confirmModal.show && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
                    <h3 className="text-xl font-bold text-zinc-900 mb-2">Confirmar Turno</h3>
                    <p className="text-sm text-zinc-500 mb-4">
                        Ingresa el precio final del servicio. Esto se enviará al cliente junto con la solicitud de seña (si aplica).
                    </p>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Precio Final ($)</label>
                            <input 
                                type="number" 
                                autoFocus
                                placeholder="Ej: 15000"
                                className="w-full p-3 border border-zinc-200 rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                value={priceInput}
                                onChange={(e) => setPriceInput(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-zinc-500 uppercase mb-1 block">Duración Estimada (min)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    placeholder="Ej: 60"
                                    className="w-full p-3 border border-zinc-200 rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-indigo-500 pr-12"
                                    value={durationInput}
                                    onChange={(e) => setDurationInput(e.target.value)}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">min</span>
                            </div>
                            <p className="text-[10px] text-zinc-400 mt-1">Este tiempo es el que ocupará en la agenda final.</p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                onClick={() => setConfirmModal({ show: false, turnoId: null })}
                                className="flex-1 py-3 text-zinc-500 font-bold hover:bg-zinc-100 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleConfirmAction}
                                disabled={isConfirming || !priceInput}
                                className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isConfirming ? "Procesando..." : "Enviar y Confirmar"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* 4. Renderizado del Modal del Editor */}
        {showEditor && (
            <WebEditor 
                initialData={negocio}
                model="negocio"
                onClose={() => {
                    setShowEditor(false);
                    setActiveTab("resumen");
                }}
                onSave={async () => {
                    await fetchDashboardData();
                }}
            />
        )}
      </main>
    </div>
  );
}



function CalendarTab({ negocio, turnos, handleConnectGoogle, onCancel, onContact, onReschedule }: any) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const supabase = createClient(); 
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

    const [detailsModal, setDetailsModal] = useState<{show: boolean, data: any}>({ show: false, data: null });
    const [filtroCalendario, setFiltroCalendario] = useState<string>("Todos");

    const handleDeleteFromMenu = async (id: string) => {
        if(!confirm("¿Estás seguro de cancelar este turno? Se eliminará de Google Calendar.")) return;
        
        const res = await cancelAppointment(id);

        if (res.success) {
            onCancel(id);
        } else {
            alert("Error al cancelar: " + res.error);
        }
    };
    const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
        e.stopPropagation();
        
        if (activeMenuId === id) {
            setActiveMenuId(null);
            return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const menuWidth = 208; // Ancho estimado del menú (w-52)
        const menuHeight = 220; // Alto estimado

        // Cálculo para que no se salga por la derecha
        let left = rect.left;
        if (left + menuWidth > screenWidth - 20) {
            left = rect.right - menuWidth;
        }

        // Cálculo para que no se salga por abajo
        let top = rect.bottom + 5;
        if (top + menuHeight > screenHeight) {
            top = rect.top - menuHeight - 5;
        }

        setMenuPos({ top, left });
        setActiveMenuId(id);
    };

    if (!negocio.google_calendar_connected) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-[600px] flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-zinc-300 text-center p-8">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <CalendarIcon size={40} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">Conecta tu Calendario</h2>
                <p className="text-zinc-500 max-w-md mb-8">
                    Para visualizar y gestionar tus turnos aquí, necesitamos sincronizar con tu Google Calendar.
                </p>
                <button onClick={handleConnectGoogle} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg">
                    <LinkIcon size={18} /> Conectar con Google
                </button>
            </div>
        );
    }

    const getDaysOfWeek = (date: Date) => {
        const start = new Date(date);
        const day = start.getDay(); 
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(start.setDate(diff));
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push(d);
        }
        return days;
    };

    const days = getDaysOfWeek(currentDate);
    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
    };
    const equipo = negocio.config_web?.equipo?.members || negocio.config_web?.equipo?.items || [];
    const nombresTrabajadores = equipo.map((m: any) => m.name || m.nombre).filter(Boolean);

    const turnoPasaFiltro = (t: any) => {
        if (filtroCalendario === "Todos") return true;
        const workerNameFromService = typeof t.servicio === 'string' && t.servicio.includes(" - ") 
            ? t.servicio.split(" - ")[1].trim() 
            : "";
        const tWorker = t.worker_name?.trim() || workerNameFromService;
        return tWorker === filtroCalendario;
    };



    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-[calc(100vh-140px)] flex flex-col">
            {/* HEADER DEL CALENDARIO */}
            <header className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Tu Calendario</h1>
                    <p className="text-zinc-500 text-sm">Gestiona tus turnos de la semana.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                    {/* ---> NUEVO: Selector de Profesional */}
                    {nombresTrabajadores.length > 0 && (
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-zinc-200 shadow-sm">
                            <label className="text-xs font-bold text-zinc-500 uppercase">Profesional:</label>
                            <select 
                                className="bg-transparent text-sm font-bold text-indigo-600 outline-none cursor-pointer"
                                value={filtroCalendario}
                                onChange={(e) => setFiltroCalendario(e.target.value)}
                            >
                                <option value="Todos">Todos</option>
                                {nombresTrabajadores.map((nombre: string, idx: number) => (
                                    <option key={idx} value={nombre}>{nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Botones de navegación de fecha originales */}
                    <div className="flex items-center gap-4 bg-white p-1 rounded-xl border border-zinc-200 shadow-sm">
                        <button onClick={() => {const d = new Date(currentDate); d.setDate(d.getDate()-7); setCurrentDate(d)}} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600"><ChevronLeft size={20}/></button>
                        <span className="text-sm font-bold min-w-[140px] text-center capitalize">
                            {days[0].toLocaleDateString('es-AR', { month: 'long', day: 'numeric' })} - {days[6].toLocaleDateString('es-AR', { month: 'long', day: 'numeric' })}
                        </span>
                        <button onClick={() => {const d = new Date(currentDate); d.setDate(d.getDate()+7); setCurrentDate(d)}} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600"><ChevronRight size={20}/></button>
                    </div>
                </div>
            </header>

            {/* GRILLA DEL CALENDARIO */}
            <div className="flex-1 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                <div className="hidden lg:grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
                    {days.map((day, i) => (
                        <div key={i} className={`py-4 text-center border-r border-zinc-100 last:border-0 ${isToday(day) ? 'bg-blue-50/50' : ''}`}>
                            <p className="text-xs font-bold text-zinc-400 uppercase mb-1">{day.toLocaleDateString('es-AR', { weekday: 'short' })}</p>
                            <div className={`text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isToday(day) ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-900'}`}>{day.getDate()}</div>
                        </div>
                    ))}
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-7 overflow-y-auto min-h-[500px] pb-32">
                    {days.map((day, i) => {
                        const dayTurnos = turnos.filter((t: any) => {
                            const tDate = new Date(t.fecha_inicio);
                            return tDate.getDate() === day.getDate() && tDate.getMonth() === day.getMonth() && tDate.getFullYear() === day.getFullYear() && turnoPasaFiltro(t);
                        }).sort((a: any, b: any) => new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime());

                        return (
                            <div key={i} className={`border-r border-zinc-100 last:border-0 p-2 space-y-2 ${isToday(day) ? 'bg-blue-50/10' : ''}`}>
                                <div className={`lg:hidden flex items-center gap-2 py-2 px-2 mb-2 rounded-lg ${isToday(day) ? 'bg-blue-50 text-blue-700' : 'bg-zinc-50 text-zinc-600'}`}>
                                    <span className="font-bold text-sm capitalize">{day.toLocaleDateString('es-AR', { weekday: 'long' })}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isToday(day) ? 'bg-blue-200' : 'bg-zinc-200'}`}>{day.getDate()}</span>
                                </div>
                                
                                {dayTurnos.length === 0 && <div className="md:hidden text-center py-4 text-xs text-zinc-300 italic">Sin actividad</div>}

                                {dayTurnos.map((t: any) => {
                                    // 1. LÓGICA DE COLORES SEMÁFORO
                                    let estadoStyles = { 
                                        border: 'border-l-emerald-500', // Verde por defecto (confirmado)
                                        bgHeader: 'bg-emerald-50', 
                                        textHeader: 'text-emerald-700' 
                                    };

                                    if (t.estado === 'pendiente') {
                                        // ROJO: Pendiente (Nueva solicitud)
                                        estadoStyles = { 
                                            border: 'border-l-red-500', 
                                            bgHeader: 'bg-red-50', 
                                            textHeader: 'text-red-700' 
                                        };
                                    } else if (t.estado === 'esperando_senia') {
                                        // AMARILLO: Esperando Seña
                                        estadoStyles = { 
                                            border: 'border-l-yellow-400', 
                                            bgHeader: 'bg-yellow-50', 
                                            textHeader: 'text-yellow-700' 
                                        };
                                    }

                                    return (
                                        <div 
                                            key={t.id} 
                                            className={`bg-white p-3 rounded-lg border border-zinc-200 shadow-sm relative group border-l-4 hover:shadow-md transition-all ${estadoStyles.border}`}
                                        >
                                            
                                            {/* HEADER DE LA TARJETA CON COLOR DINÁMICO */}
                                            <div className={`flex justify-between items-start mb-2 p-1.5 rounded ${estadoStyles.bgHeader} ${estadoStyles.textHeader}`}>
                                                <div className="flex flex-col w-full">
                                                    <p className="text-[11px] font-bold flex flex-wrap items-center gap-1 leading-tight">
                                                        <Clock size={12} className="shrink-0" /> 
                                                        
                                                        <span>
                                                            {new Date(t.fecha_inicio).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}
                                                        </span>
                                                        
                                                        {/* MOSTRAR HORA DE FIN EN LUGAR DE LA DURACIÓN */}
                                                        {t.fecha_fin && (
                                                            <span className="font-medium opacity-80 whitespace-nowrap">
                                                                - {new Date(t.fecha_fin).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>

                                                {/* MENÚ DE 3 PUNTOS */}
                                                <button 
                                                    onClick={(e) => handleMenuClick(e, t.id)}
                                                    className="hover:bg-white/50 p-0.5 rounded transition-colors"
                                                >
                                                    <MoreVertical size={14} />
                                                </button>
                                            </div>

                                            {/* MENÚ DESPLEGABLE */}
                                            {activeMenuId === t.id && (
                                                <>
                                                    {/* Fondo transparente con z-40 */}
                                                    <div className="fixed inset-0 z-40" onClick={() => setActiveMenuId(null)} />
                                                    
                                                    {/* Menú con fixed, z-50 y style dinámico */}
                                                    <div 
                                                        className="fixed z-50 bg-white rounded-lg shadow-xl border border-zinc-100 py-1 w-52 animate-in fade-in zoom-in-95 duration-100"
                                                        style={{ top: menuPos.top, left: menuPos.left }}
                                                    >
                                                        
                                                        {/* OPCIÓN VER DETALLES (Condicional) */}
                                                        {(t.mensaje || (t.fotos && t.fotos.length > 0)) && (
                                                            <button 
                                                                onClick={() => { setDetailsModal({ show: true, data: t }); setActiveMenuId(null); }}
                                                                className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-blue-600 flex items-center gap-2 border-b border-zinc-50"
                                                            >
                                                                <Eye size={14} /> Ver Solicitud
                                                            </button>
                                                        )}

                                                        <button 
                                                            onClick={() => { onReschedule(t.id, t.fecha_inicio); setActiveMenuId(null); }}
                                                            className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-indigo-600 flex items-center gap-2"
                                                        >
                                                            <Edit size={14} /> Reprogramar
                                                        </button>
                                                        <button 
                                                            onClick={() => { onContact(t.cliente_email, t.cliente_nombre); setActiveMenuId(null); }}
                                                            className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-emerald-600 flex items-center gap-2"
                                                        >
                                                            <Mail size={14} /> Email
                                                        </button>
                                                        {t.cliente_telefono && (
                                                            <a 
                                                                href={`https://wa.me/${t.cliente_telefono.replace(/\D/g,'')}`}
                                                                target="_blank" rel="noopener noreferrer"
                                                                className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-green-600 flex items-center gap-2"
                                                            >
                                                                <Phone size={14} /> WhatsApp
                                                            </a>
                                                        )}
                                                        <div className="h-px bg-zinc-100 my-1" />
                                                        <button 
                                                            onClick={() => handleDeleteFromMenu(t.id)}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                        >
                                                            <Trash2 size={14} /> Cancelar Turno
                                                        </button>
                                                    </div>
                                                </>
                                            )}

                                            <p className="text-sm font-bold text-zinc-900 truncate pr-1">{t.cliente_nombre}</p>
                                            
                                            <div className="flex flex-col mt-1">
                                                <p className="text-xs font-medium text-zinc-700 truncate">
                                                    {typeof t.servicio === 'string'
                                                        ? (t.servicio.includes(" - ") ? t.servicio.split(" - ")[0] : t.servicio)
                                                        : (t.servicio?.titulo || t.servicio?.name || "Servicio Agendado")
                                                    }
                                                </p>
                                                {(t.worker_name || (typeof t.servicio === 'string' && t.servicio.includes(" - "))) && (
                                                    <p className="text-[10px] text-zinc-400 flex items-center gap-1 truncate mt-0.5">
                                                        <User size={10}/>
                                                        {t.worker_name || (typeof t.servicio === 'string' ? t.servicio.split(" - ")[1] : "")}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MODAL DE DETALLES (Mensaje y Fotos) */}
            {detailsModal.show && detailsModal.data && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl relative animate-in fade-in zoom-in-95 duration-200">
                        <button 
                            onClick={() => setDetailsModal({ show: false, data: null })}
                            className="absolute top-4 right-4 p-2 text-zinc-400 hover:bg-zinc-100 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-lg font-bold mb-1 text-zinc-900">Detalles de la Solicitud</h3>
                        <p className="text-sm text-zinc-500 mb-6">Información enviada por {detailsModal.data.cliente_nombre}</p>

                        <div className="space-y-6">
                            {detailsModal.data.mensaje ? (
                                <div>
                                    <label className="text-xs font-bold text-zinc-400 uppercase block mb-2">Mensaje del Cliente</label>
                                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100 italic text-zinc-600 text-sm">
                                        "{detailsModal.data.mensaje}"
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-400 italic">Sin mensaje adjunto.</p>
                            )}

                            {detailsModal.data.fotos && detailsModal.data.fotos.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold text-zinc-400 uppercase block mb-2 flex items-center gap-2">
                                        <LinkIcon size={12}/> Archivos Adjuntos ({detailsModal.data.fotos.length})
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {detailsModal.data.fotos.map((url: string, index: number) => (
                                            <a 
                                                key={index} 
                                                href={url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="relative aspect-square rounded-lg overflow-hidden border border-zinc-200 shadow-sm hover:ring-2 hover:ring-indigo-500 transition-all group"
                                            >
                                                <img 
                                                    src={url} 
                                                    alt={`Adjunto ${index + 1}`} 
                                                    className="w-full h-full object-cover" 
                                                />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                    <ExternalLink size={16} className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8">
                             <button 
                                onClick={() => setDetailsModal({ show: false, data: null })}
                                className="w-full py-3 bg-zinc-100 text-zinc-600 font-bold rounded-xl hover:bg-zinc-200 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ClientesTable({ turnos, setContactModal }: any) {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleRow = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };
    const formatearFecha = (isoString: string) => {
        if (!isoString) return "Sin fecha";
        try {
            const [fechaPart, horaPart] = isoString.split('T');
            const fecha = fechaPart.split('-').reverse().join('/');
            const hora = horaPart ? horaPart.slice(0, 5) : "";
            return `${fecha} - ${hora}`;
        } catch (e) {
            return isoString;
        }
    };
    const getWhatsAppLink = (phone: string) => {
        const cleanPhone = phone.replace(/\D/g, '');
        return `https://wa.me/${cleanPhone}`;
    };

    return (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                {/* --- VISTA ESCRITORIO (TABLE) --- */}
                <div className="hidden lg:block">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-50/50 border-b border-zinc-100 text-zinc-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Nombre</th>
                                <th className="px-6 py-4">Teléfono</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Servicio</th>
                                <th className="px-6 py-4">Último Turno</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-50">
                            {turnos.map((t: any) => (
                                <tr key={t.id} className="group hover:bg-zinc-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-zinc-900">{t.cliente_nombre}</td>
                                    <td className="px-6 py-4 font-mono text-zinc-600">
                                        {t.cliente_telefono || "Sin teléfono"}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500">{t.cliente_email}</td>
                                    <td className="px-6 py-4 text-zinc-500">{t.servicio || "General"}</td>
                                    <td className="px-6 py-4 font-mono text-zinc-600 text-xs">
                                        {formatearFecha(t.fecha_inicio)}
                                    </td>
                                    <td className="px-6 py-4">
                                    <div className="flex justify-end gap-2">
                                        {/* BOTÓN WHATSAPP (PC) */}
                                        {t.cliente_telefono && (
                                            <a 
                                                href={getWhatsAppLink(t.cliente_telefono)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-bold text-xs"
                                            >
                                                <MessageCircle size={14} /> 
                                                WhatsApp
                                            </a>
                                        )}
                                        
                                        {/* BOTÓN EMAIL (PC) */}
                                        <button 
                                            onClick={() => setContactModal({ 
                                                show: true, 
                                                clientEmail: t.cliente_email, 
                                                clientName: t.cliente_nombre 
                                            })}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-bold text-xs"
                                        >
                                            <Mail size={14} /> 
                                            Email
                                        </button>
                                    </div>
                                </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
    
                {/* --- VISTA MÓVIL (CARDS EXPANDIBLES) --- */}
                <div className="lg:hidden divide-y divide-zinc-100">
                    {turnos.map((t: any) => (
                        <div key={t.id} className="flex flex-col">
                            {/* Fila Colapsada: Siempre visible */}
                            <div 
                                onClick={() => toggleRow(t.id)}
                                className="p-4 flex items-center justify-between active:bg-zinc-50 transition-colors cursor-pointer"
                            >
                                <div className="flex flex-col">
                                    <span className="font-bold text-zinc-900">{t.cliente_nombre}</span>
                                    <span className="text-sm text-zinc-500 flex items-center gap-1.5">
                                        <Phone size={12} className="text-zinc-400" />
                                        {t.cliente_telefono || "Sin teléfono"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {t.cliente_telefono && (
                                        <a 
                                            href={getWhatsAppLink(t.cliente_telefono)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="p-2 bg-emerald-50 text-emerald-600 rounded-full"
                                        >
                                            <MessageCircle size={14} /> 
                                        </a>
                                    )}
                                    <div className="text-zinc-400">
                                        {expandedId === t.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>
                            </div>
    
                            {/* Contenido Expandido: Detalles adicionales */}
                            {expandedId === t.id && (
                                <div className="px-4 pb-4 pt-2 bg-zinc-50/50 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="space-y-3 border-t border-zinc-100 pt-3">
                                        <div className="flex items-center gap-3 text-sm">
                                            <Mail size={16} className="text-zinc-400 shrink-0" />
                                            <span className="text-zinc-600 truncate">{t.cliente_email}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Briefcase size={16} className="text-zinc-400 shrink-0" />
                                            <span className="text-zinc-600">{t.servicio || "General"}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <Calendar size={16} className="text-zinc-400 shrink-0" />
                                            <span className="text-zinc-600 font-mono text-xs">
                                                Último: {formatearFecha(t.fecha_inicio)}
                                            </span>
                                        </div>
                                        
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setContactModal({ 
                                                    show: true, 
                                                    clientEmail: t.cliente_email, 
                                                    clientName: t.cliente_nombre 
                                                });
                                            }}
                                            className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-sm"
                                        >
                                            <Mail size={16} /> Enviar Email Profesional
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                
                {turnos.length === 0 && (
                    <div className="p-10 text-center text-zinc-400 text-sm">
                        No hay clientes registrados aún.
                    </div>
                )}
            </div>
        );
    }
function SidebarItem({ icon, label, active, onClick, badge }: any) {
    return (
        <button onClick={onClick} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all mb-1 ${active ? "bg-zinc-100 text-zinc-900" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"}`}>
            <div className="flex items-center gap-3"><span className={active ? "text-zinc-900" : "text-zinc-400"}>{icon}</span>{label}</div>
            {badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge === '!' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>{badge}</span>}
        </button>
    )
}
function StatCard({ title, value, icon, subtext }: any) {
     return (
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4"><div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100">{icon}</div></div>
            <div>
                <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-3xl font-extrabold text-zinc-900 tracking-tight">{value}</h3>
                {subtext && <p className="text-zinc-400 text-xs mt-2">{subtext}</p>}
            </div>
        </div>
    )
}
function ReviewsTab({ resenas, onToggle }: any) {
    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <header className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                    <Star className="text-yellow-400 fill-yellow-400" /> 
                    Reseñas de Clientes ({resenas.length})
                </h2>
                <p className="text-zinc-500 text-sm">Opiniones recibidas desde tu Landing Page.</p>
            </header>

            {resenas.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-300">
                    <div className="w-16 h-16 bg-zinc-50 text-zinc-300 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageCircle size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900">Sin reseñas aún</h3>
                    <p className="text-zinc-500 max-w-sm mx-auto mt-1">
                        Comparte el link de tu landing con tus clientes para empezar a recibir opiniones.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {resenas.map((review: any) => (
                        <div 
                            key={review.id} 
                            // CORRECCIÓN AQUÍ: Agregué 'relative' al principio de las clases
                            className="relative bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group"
                        >
                            {/* --- BOTÓN DE VISIBILIDAD --- */}
                            {/* Ahora que el padre es relative, este absolute se quedará dentro de la tarjeta */}
                            <div className="absolute top-4 right-4 z-10">
                                <button 
                                    onClick={() => onToggle(review.id, review.visible)}
                                    className={`p-2 rounded-full transition-colors ${review.visible ? 'text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50' : 'text-zinc-400 hover:text-zinc-600 bg-zinc-200'}`}
                                    title={review.visible ? "Ocultar reseña" : "Mostrar reseña"}
                                >
                                    {review.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                            </div>

                            {/* Encabezado */}
                            <div className="flex justify-between items-start mb-3 pr-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 font-bold border border-indigo-100">
                                        <User size={18} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-zinc-900">{review.nombre_cliente || "Anónimo"}</p>
                                        <p className="text-[11px] text-zinc-400 font-medium uppercase tracking-wide">
                                            {new Date(review.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                {/* Estrellas */}
                                <div className="flex bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100 gap-0.5">
                                    {[...Array(5)].map((_, i) => (
                                        <Star 
                                            key={i} 
                                            size={12} 
                                            className={i < review.puntuacion ? "text-yellow-400 fill-yellow-400" : "text-zinc-200"} 
                                        />
                                    ))}
                                </div>
                            </div>
                            
                            {/* Comentario */}
                            <div className="relative mt-2">
                                <span className="absolute -top-2 -left-1 text-4xl text-zinc-200 font-serif leading-none">“</span>
                                <p className="text-sm text-zinc-600 italic leading-relaxed pl-4 relative z-10">
                                    {review.comentario}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
function SubscriptionTab({ negocio, CONST_LINK_MP }: any) {
    return (<div className="p-6 text-center text-zinc-400 bg-white rounded-2xl border border-zinc-200">Panel de Suscripción (simplificado)</div>);
}
function ConfigTab({ negocio, handleConnectGoogle }: any) {
    const supabase = createClient();
    const workers = negocio.config_web?.equipo?.members || negocio.config_web?.equipo?.items || [];
    const isWhatsAppConnected = !!negocio?.whatsapp_access_token;
    
    // Estados para manejar el flujo del QR
    const [waStatus, setWaStatus] = useState<'disconnected' | 'loading_qr' | 'waiting_scan' | 'connected'>(
        isWhatsAppConnected ? 'connected' : 'disconnected'
    );
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
    const [newInstanceName, setNewInstanceName] = useState<string | null>(null);

    const handleGenerateQR = async () => {
        setWaStatus('loading_qr');
        
        try {
            // Llamamos a nuestro backend seguro que acabás de crear
            const response = await fetch('/api/Whatsapp/generar-qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ negocioId: negocio.id })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            // Mostramos el QR REAL que vino de tu servidor en Railway
            // Evolution ya devuelve el base64 listo para usar en la etiqueta <img>
            setQrCodeUrl(data.qrCodeBase64);
            setWaStatus('waiting_scan');
            setNewInstanceName(data.instanceName);

            // Guardamos el nombre de la instancia en la base de datos (Supabase)
            

        } catch (error: any) { // <-- Asegurate de que diga error: any
            console.error(error);
            // Ahora la alerta nos mostrará el problema real que viene del backend
            alert("Error de WhatsApp: " + error.message);
            setWaStatus('disconnected');
        }
    };

    const vincularWhatsApp = async (instanceToken: string) => {
        try {
            const { error } = await supabase
                .from('negocios')
                .update({ whatsapp_access_token: instanceToken })
                .eq('id', negocio.id);

            if (error) throw error;
            setWaStatus('connected');
            setQrCodeUrl(null);
            alert("¡WhatsApp vinculado con éxito!");
            window.location.reload(); 
        } catch (error) {
            alert("Error al guardar la vinculación.");
            setWaStatus('disconnected');
        }
    };

    const handleDisconnectWhatsApp = async () => {
        if (!window.confirm("¿Seguro que quieres desconectar tu WhatsApp? Dejarás de enviar recordatorios automáticos.")) return;
        try {
            // Aquí en el futuro le diremos a la API que cierre la sesión
            await supabase.from('negocios').update({ whatsapp_access_token: null }).eq('id', negocio.id);
            window.location.reload();
        } catch (error) {
            alert("Error al desconectar.");
        }
    };

    

    const handleDisconnect = async () => {
        const confirmacion = window.confirm("¿Estás seguro de que quieres desconectar Google Calendar? Dejarás de sincronizar tus turnos.");
        
        if (!confirmacion) return;

        try {
            // Limpiamos los tokens y el estado en Supabase
            const { error } = await supabase
                .from('negocios')
                .update({
                    google_calendar_connected: false,
                    google_access_token: null,
                    google_refresh_token: null,
                    // google_watch_id: null // Descomenta si usas webhooks
                })
                .eq('id', negocio.id);

            if (error) throw error;

            // Recargamos la página para actualizar el estado visual
            window.location.reload(); 
        } catch (error: any) {
            alert("Error al desconectar: " + error.message);
        }
    }; 
    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-[calc(100dvh-140px)] flex flex-col">

            {/* --- 1. SECCIÓN DOMINIO Y SEO (NUEVO) --- */}
            <section>
                <header className="mb-6"><h2 className="text-2xl font-bold">Dominio y Personalización</h2></header>
                
                {/* Aquí inyectamos los datos desde config_web */}
                <DomainManager 
                    negocioId={negocio.id}
                    initialDomain={negocio.custom_domain}
                    // Leemos la metadata desde config_web
                    initialTitle={negocio.config_web?.metadata?.title || ""}
                    initialFavicon={negocio.config_web?.metadata?.faviconUrl || ""}
                />
            </section>
            
            {/* SECCIÓN 2: INTEGRACIONES (La que ya tenías) */}
            <section>
                <header className="mb-6"><h2 className="text-2xl font-bold">Integraciones</h2></header>
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 flex justify-between gap-6">
                    {/* ... (tu código del botón de Google Calendar) ... */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><CalendarIcon size={24} /></div>
                        <div>
                            <h3 className="font-bold text-zinc-900">Google Calendar</h3>
                            <p className="text-sm text-zinc-500 mt-1">Sincroniza tus turnos.</p>
                            {negocio.google_calendar_connected ? <div className="mt-2 text-emerald-600 text-sm font-bold flex gap-1 items-center"><Check size={14}/> Conectado</div> : <div className="mt-2 text-zinc-400 text-sm">Desconectado</div>}
                        </div>
                    </div>
                    {/* ... (tus botones de conectar/desconectar) ... */}
                    <div className="flex flex-col gap-2">
                         <button onClick={handleConnectGoogle} disabled={negocio.google_calendar_connected} className={`px-4 py-2 rounded-lg text-sm font-bold ${negocio.google_calendar_connected ? "bg-zinc-100 text-zinc-400" : "bg-blue-600 text-white"}`}>
                            {negocio.google_calendar_connected ? "Listo" : "Conectar"}
                        </button>
                        {negocio.google_calendar_connected && (
                            <button onClick={handleDisconnect} className="text-xs text-red-500 hover:underline">Desconectar</button>
                        )}
                    </div>
                </div>

                <div className="mt-4 bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 flex flex-col gap-6">
                    <div className="flex justify-between gap-6">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 bg-[#25D366]/10 text-[#25D366] rounded-xl flex items-center justify-center shrink-0">
                                <MessageCircle size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900">Conexión de WhatsApp</h3>
                                <p className="text-sm text-zinc-500 mt-1 max-w-md">
                                    Conecta el WhatsApp del local escaneando un código QR. Los recordatorios saldrán desde ese número.
                                </p>
                                {waStatus === 'connected' ? (
                                    <div className="mt-2 text-emerald-600 text-sm font-bold flex gap-1 items-center"><Check size={14}/> Conectado y Activo</div>
                                ) : (
                                    <div className="mt-2 text-zinc-400 text-sm">Desconectado</div>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 shrink-0">
                            <button 
                                onClick={handleGenerateQR} 
                                disabled={waStatus !== 'disconnected'} 
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors min-w-[140px] ${waStatus === 'connected' ? "bg-zinc-100 text-zinc-400" : "bg-[#25D366] hover:bg-[#20bd5a] text-white shadow-md"}`}
                            >
                                {waStatus === 'loading_qr' ? "Generando..." : waStatus === 'waiting_scan' ? "Esperando..." : waStatus === 'connected' ? "Listo" : "Generar QR"}
                            </button>
                            {waStatus === 'connected' && (
                                <button onClick={handleDisconnectWhatsApp} className="text-xs text-red-500 hover:underline font-medium text-center">Desconectar</button>
                            )}
                        </div>
                    </div>

                    {/* ZONA DONDE APARECE EL QR */}
                    {waStatus === 'waiting_scan' && qrCodeUrl && (
                        <div className="mt-2 p-6 bg-zinc-50 border border-zinc-200 rounded-xl flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
                            <h4 className="font-bold text-zinc-800 mb-2">Escanea este código</h4>
                            <p className="text-sm text-zinc-500 mb-6 text-center max-w-sm">
                                1. Abre WhatsApp en tu celular.<br/>
                                2. Toca Menú o Configuración y selecciona <b>Dispositivos vinculados</b>.<br/>
                                3. Toca <b>Vincular un dispositivo</b> y apunta tu pantalla a este código.
                            </p>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-zinc-100">
                                <img src={qrCodeUrl} alt="WhatsApp QR Code" className="w-48 h-48" />
                            </div>
                            <div className="mt-6 flex items-center gap-2 text-sm text-amber-600 font-medium bg-amber-50 px-4 py-2 rounded-lg border border-amber-100">
                                <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                                Esperando escaneo...
                            </div>
                            <button 
                                onClick={() => newInstanceName && vincularWhatsApp(newInstanceName)}
                                className="mt-6 px-6 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl transition-colors shadow-lg flex items-center gap-2"
                            >
                                <Check size={18} /> Listo, ya lo escaneé
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* NUEVA SECCIÓN: SEGURIDAD */}
            <section>
                <header className="mb-6"><h2 className="text-2xl font-bold">Cuenta y Seguridad</h2></header>
                {/* Pasamos el email del negocio para el flujo de 6 dígitos */}
                <PasswordManager email={negocio.email} />
            </section>

        </div>
    )
}
function PromotionsTab({ initialConfig, negocioId }: { initialConfig: any, negocioId: string }) {
    const [config, setConfig] = useState(initialConfig || { services: [] });
    const [loading, setLoading] = useState(false);
    const supabase = createClient();
    const equipo = config?.equipo?.members || config?.equipo?.items || [];
    
    // Estado para el formulario de nueva promoción
    const [newPromo, setNewPromo] = useState<{
        name: string;
        description: string;
        price: string;
        duration: string;
        isPromo: boolean;
        promoEndDate: string;
        workerIds: string[]; // <-- NUEVO
    }>({
        name: '',
        description: '',
        price: '',
        duration: '60',
        isPromo: true,
        promoEndDate: '',
        workerIds: [] // <-- NUEVO
    });

    const handleSave = async (updatedServices: any[]) => {
        setLoading(true);
        const newConfig = { ...config, services: updatedServices };
        
        const { error } = await supabase
            .from('negocios')
            .update({ config_web: newConfig })
            .eq('id', negocioId);

        if (error) {
            alert("Error al guardar: " + error.message);
        } else {
            setConfig(newConfig);
            alert("Cambios guardados correctamente");
            // Limpiar formulario si fue una creación
            setNewPromo({ ...newPromo, name: '', description: '', price: '', promoEndDate: '', workerIds: [] });
        }
        setLoading(false);
    };

    const handleAddPromo = () => {
        if (!newPromo.name || !newPromo.price || !newPromo.promoEndDate) {
            alert("Completa los campos obligatorios (Nombre, Precio, Fecha Límite)");
            return;
        }

        const promoService = {
            id: crypto.randomUUID(), // Generar ID único
            ...newPromo,
            price: Number(newPromo.price),
            duration: Number(newPromo.duration)
        };

        handleSave([...(config.services || []), promoService]);
    };

    const handleDelete = (id: string) => {
        if(!confirm("¿Eliminar esta promoción?")) return;
        const filtered = (config.services || []).filter((s: any) => s.id !== id);
        handleSave(filtered);
    };

    // Filtrar solo las promociones actuales
    const promos = (config.services || []).filter((s: any) => s.isPromo);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-8 max-w-4xl">
            <header className="mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Tag className="text-pink-600" /> 
                    Gestión de Promociones
                </h2>
                <p className="text-zinc-500 text-sm">Crea ofertas por tiempo limitado que resaltarán en tu página.</p>
            </header>

            {/* FORMULARIO DE CREACIÓN */}
            <div className="bg-white p-6 rounded-2xl border border-pink-100 shadow-sm">
                <h3 className="font-bold text-lg mb-4 text-pink-700">Crear Nueva Promoción</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <input 
                        placeholder="Nombre de la Promoción (Ej: 2x1 Corte)" 
                        className="p-2 border rounded-lg w-full"
                        value={newPromo.name}
                        onChange={e => setNewPromo({...newPromo, name: e.target.value})}
                    />
                    <input 
                        type="number" 
                        placeholder="Precio Promocional ($)" 
                        className="p-2 border rounded-lg w-full"
                        value={newPromo.price}
                        onChange={e => setNewPromo({...newPromo, price: e.target.value})}
                    />
                    <div className="md:col-span-2">
                        <textarea 
                            placeholder="Descripción breve..." 
                            className="p-2 border rounded-lg w-full h-20 resize-none"
                            value={newPromo.description}
                            onChange={e => setNewPromo({...newPromo, description: e.target.value})}
                        />
                    </div>
                    
                    {/* NUEVO SELECTOR DE DURACIÓN (STEPPER) */}
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-2">Duración del Servicio</label>
                        
                        <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-zinc-200 w-full max-w-[250px]">
                            {/* Botón Restar */}
                            <button 
                                onClick={() => {
                                    const current = Number(newPromo.duration);
                                    // Lógica: Si es <= 60 baja de 15 en 15. Si es > 60 baja de 30 en 30. Minimo 15.
                                    let newVal = current;
                                    if (current <= 60) {
                                        newVal = Math.max(15, current - 15);
                                    } else {
                                        newVal = current - 30;
                                    }
                                    setNewPromo({ ...newPromo, duration: newVal.toString() });
                                }}
                                className="w-10 h-10 flex items-center justify-center bg-zinc-50 hover:bg-zinc-100 text-zinc-600 rounded-lg transition-colors border border-zinc-100 active:scale-95"
                            >
                                <Minus size={18} />
                            </button>

                            {/* Visualizador */}
                            <div className="flex-1 text-center">
                                <span className="text-lg font-bold text-zinc-900 block">
                                    {Number(newPromo.duration) < 60 
                                        ? `${newPromo.duration} min`
                                        : Number(newPromo.duration) === 60 
                                            ? "1 hora"
                                            : (() => {
                                                const h = Math.floor(Number(newPromo.duration) / 60);
                                                const m = Number(newPromo.duration) % 60;
                                                return `${h}h ${m > 0 ? `${m}m` : ''}`;
                                              })()
                                    }
                                </span>
                                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
                                    Tiempo
                                </span>
                            </div>

                            {/* Botón Sumar */}
                            <button 
                                onClick={() => {
                                    const current = Number(newPromo.duration);
                                    // Lógica: Si es < 60 sube 15. Si es >= 60 sube 30.
                                    let newVal = current;
                                    if (current < 60) {
                                        newVal = current + 15;
                                    } else {
                                        newVal = current + 30;
                                    }
                                    setNewPromo({ ...newPromo, duration: newVal.toString() });
                                }}
                                className="w-10 h-10 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg transition-colors shadow-sm active:scale-95"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-pink-600 mb-1">Válida hasta (inclusive)</label>
                        <input 
                            type="date" 
                            className="p-2 border border-pink-200 rounded-lg w-full bg-pink-50"
                            value={newPromo.promoEndDate}
                            onChange={e => setNewPromo({...newPromo, promoEndDate: e.target.value})}
                        />
                    </div>
                </div>
                {/* --- NUEVO: SELECCIÓN DE PROFESIONALES --- */}
                    {equipo.length > 0 && (
                        <div className="md:col-span-2 bg-zinc-50 p-4 rounded-xl border border-zinc-200 mt-2">
                            <label className="block text-xs font-bold text-zinc-500 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <Users size={14}/> ¿Qué profesionales realizan esta promoción?
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {equipo.map((worker: any) => {
                                    const isChecked = newPromo.workerIds.includes(worker.id);
                                    return (
                                        <label key={worker.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium cursor-pointer transition-colors select-none ${isChecked ? 'bg-pink-50 border-pink-200 text-pink-700' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-100'}`}>
                                            <input 
                                                type="checkbox" 
                                                className="hidden"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    const currentIds = newPromo.workerIds;
                                                    const newIds = e.target.checked 
                                                        ? [...currentIds, worker.id] 
                                                        : currentIds.filter(id => id !== worker.id);
                                                    setNewPromo({ ...newPromo, workerIds: newIds });
                                                }}
                                            />
                                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${isChecked ? 'bg-pink-500 border-pink-500' : 'bg-zinc-100 border-zinc-300'}`}>
                                                {isChecked && <Check size={8} className="text-white"/>}
                                            </div>
                                            {worker.nombre || worker.name}
                                        </label>
                                    );
                                })}
                            </div>
                            <p className="text-[10px] text-zinc-400 mt-2">Si no seleccionas ninguno, la promoción estará disponible para todos.</p>
                        </div>
                    )}
                    {/* --- FIN NUEVO --- */}
                <button 
                    onClick={handleAddPromo}
                    disabled={loading}
                    className="w-full py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-pink-200"
                >
                    {loading ? "Guardando..." : "Lanzar Promoción 🚀"}
                </button>
            </div>

            {/* LISTA DE PROMOCIONES ACTIVAS */}
            <div className="space-y-4">
                <h3 className="font-bold text-lg text-zinc-800">Promociones Activas</h3>
                {promos.length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 border border-dashed rounded-xl">No tienes promociones activas.</div>
                ) : (
                    <div className="grid gap-4">
                        {promos.map((promo: any) => (
                            <div key={promo.id} className="bg-white p-4 rounded-xl border border-l-4 border-l-pink-500 shadow-sm flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-zinc-900">{promo.name}</h4>
                                    <p className="text-sm text-zinc-500 line-clamp-1">{promo.description}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-medium">
                                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded">${promo.price}</span>
                                        <span className="text-pink-600 bg-pink-50 px-2 py-1 rounded flex items-center gap-1">
                                            <Clock size={12}/> Vence: {promo.promoEndDate}
                                        </span>
                                        {/* Badge de profesionales */}
                                        {promo.workerIds && promo.workerIds.length > 0 && (
                                            <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded flex items-center gap-1">
                                                <Users size={12}/> {promo.workerIds.length} prof.
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDelete(promo.id)}
                                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar promoción"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}