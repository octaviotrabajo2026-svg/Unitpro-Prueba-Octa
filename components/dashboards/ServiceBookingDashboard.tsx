"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { 
  Users, LayoutDashboard, LogOut, Star, MessageCircle, 
  CreditCard, Settings, Link as LinkIcon, Check, 
  Calendar as CalendarIcon, UserCheck, Clock, ChevronLeft, ChevronRight, User, Eye, EyeOff,
  Mail,
  X,
  Menu,  Calendar, ChevronDown, ChevronUp, Briefcase, ExternalLink,
  Phone, MoreVertical, Trash2, Edit, Tag} from "lucide-react";
import { BotonCancelar } from "@/components/BotonCancelar";
import MarketingCampaign from "@/components/dashboards/MarketingCampaign";
import BlockTimeManager from "@/components/dashboards/BlockTimeManager";
import ManualBookingManager from "./ManualBookingManager";
import { PasswordManager } from "@/components/dashboards/PasswordManager";
import { rescheduleBooking, cancelBooking } from "@/app/actions/service-booking/calendar-actions";

// --- CONFIGURACIÓN ---
const CONST_LINK_MP = "https://www.mercadopago.com.ar/subscriptions/checkout?preapproval_plan_id=TU_ID_DE_PLAN"; 

export default function ServiceBookingDashboard({ initialData }: { initialData: any }) {
  const negocio = initialData; // Usamos el negocio que nos pasa el Factory
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
  const [activeTab, setActiveTab] = useState<"resumen" | "calendario" | "clientes"| "solicitudes" | "resenas" | "suscripcion" | "configuracion" | "marketing"| "promociones" | "gestion_turnos">("resumen");
  const [contactModal, setContactModal] = useState({ show: false, clientEmail: '', clientName: '' });
  const [mailContent, setMailContent] = useState({ subject: '', message: '' });
  const [isSending, setIsSending] = useState(false);
  const [rescheduleModal, setRescheduleModal] = useState({ show: false, turnoId: '', currentStart: '' });
  const [newDate, setNewDate] = useState('');

  // FUNCIÓN PARA GUARDAR REPROGRAMACIÓN
  const handleRescheduleSave = async () => {
    if (!newDate) return alert("Selecciona una fecha válida");
    
    // Indicador de carga visual (opcional)
    const originalText = document.getElementById('btn-save-reschedule')?.innerText;
    if(document.getElementById('btn-save-reschedule')) {
        document.getElementById('btn-save-reschedule')!.innerText = "Guardando...";
    }

    // LLAMADA AL SERVIDOR (Server Action)
    const res = await rescheduleBooking(rescheduleModal.turnoId, new Date(newDate).toISOString());

    if (!res.success) {
        alert("Error al reprogramar: " + res.error);
        if(document.getElementById('btn-save-reschedule')) {
            document.getElementById('btn-save-reschedule')!.innerText = originalText || "Guardar";
        }
    } else {
        // Actualizamos estado local para que se vea reflejado al instante
        setTurnos(prev => prev.map(t => t.id === rescheduleModal.turnoId ? { ...t, fecha_inicio: newDate } : t));
        setRescheduleModal({ ...rescheduleModal, show: false });
        alert("Turno reprogramado y sincronizado con Google Calendar.");
    }
  };



  // --- LÓGICA DE DATOS ESPECÍFICOS ---
  useEffect(() => {
    async function cargarDatosEspecificos() {
      setLoading(true);

      // Redirección de Google (se mantiene igual)
      if (searchParams.get('google_connected') === 'true') {
        setActiveTab("calendario"); 
        router.replace(window.location.pathname, { scroll: false });
      }

      // 1. Cargar Reseñas (se mantiene igual)
      const { data: datosResenas } = await supabase
        .from("resenas")
        .select("*")
        .eq("negocio_id", negocio.id)
        .order('created_at', { ascending: false });
      if (datosResenas) setResenas(datosResenas);

      // 2. CARGAR TURNOS Y FILTRAR CLIENTES
      const { data: datosTurnos } = await supabase
        .from("turnos")
        .select("*")
        .eq("negocio_id", negocio.id)
        .neq('estado', 'cancelado')
        .order('fecha_inicio', { ascending: false }); // IMPORTANTE: Del más nuevo al más viejo
        
      if (datosTurnos) {
        setTurnos(datosTurnos); // El calendario usa todos

        // FILTRO MÁGICO: Dejamos solo el primer registro que aparezca de cada email
        const clientesUnicos = datosTurnos.filter((obj: any, index: number, self: any[]) =>
            index === self.findIndex((t: any) => (
                t.cliente_email?.trim().toLowerCase() === obj.cliente_email?.trim().toLowerCase() && t.cliente_email
            ))
        );
        
        setLeads(clientesUnicos); // Guardamos la lista limpia en 'leads'
      }
      
      setLoading(false);
    }
    cargarDatosEspecificos();
  }, [negocio.id, searchParams, router]);

useEffect(() => {
    const fetchReviews = async () => {
        if (!negocio?.id) return;
        
        const { data, error } = await supabase
            .from('resenas')
            .select('*')
            .eq('negocio_id', negocio.id)
            .order('created_at', { ascending: false }); // Las más nuevas primero

        if (data) {
            setReviews(data);
        }
    };

    fetchReviews();}, [negocio?.id]); // Se ejecuta cuando carga el negocio
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

    const regularServices = negocio.config_web?.servicios?.items?.map((s: any) => ({ 
        ...s, 
        name: s.titulo 
    })) || [];
    const promoServices = negocio.config_web?.services || [];
    const allServices = [...regularServices, ...promoServices];

  const menuItems = [
    { id: "resumen", label: "General", icon: <LayoutDashboard size={18} /> },
    { 
      id: "calendario", 
      label: "Calendario", 
      icon: <CalendarIcon size={18} />, 
      badge: !negocio.google_calendar_connected ? "!" : undefined 
    },
    { id: "clientes", label: "Clientes", icon: <UserCheck size={18} /> },
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
  



  return (
    // 1. CONTENEDOR PRINCIPAL: 
    // - En móvil: 'flex-col' (uno debajo del otro)
    // - En escritorio: 'md:flex-row' (uno al lado del otro)
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row font-sans text-zinc-900 overflow-hidden">
      
      {/* --- 2. NAVBAR MÓVIL (Solo visible en md:hidden) --- */}
      {/* Usamos h-16 (64px) fijo para poder calcular el top del menú después */}
      <div className="md:hidden bg-white border-b border-zinc-200 h-16 px-4 flex justify-between items-center sticky top-0 z-40 shadow-sm shrink-0">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 rounded-md flex items-center justify-center text-white font-bold text-sm">
                {negocio.nombre ? negocio.nombre.substring(0,1) : "N"}
            </div>
            <span className="font-bold tracking-tight text-sm truncate max-w-[150px]">{negocio.nombre}</span>
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
            <div className="md:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-sm top-16" onClick={() => setMobileMenuOpen(false)} />
            
            {/* El menú en sí */}
            <div className="md:hidden fixed top-16 left-0 w-full bg-white z-40 border-b border-zinc-200 shadow-2xl p-2 flex flex-col gap-1 animate-in slide-in-from-top-2 duration-200">
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
      <aside className="w-64 bg-white border-r border-zinc-200 hidden md:flex flex-col sticky top-0 h-screen z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="w-8 h-8 bg-zinc-900 rounded-md flex items-center justify-center text-white font-bold">
                {negocio.nombre.substring(0,1)}
            </div>
            <span className="font-bold tracking-tight truncate">{negocio.nombre}</span>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    turnos={turnos} 
                    handleConnectGoogle={handleConnectGoogle}
                    onCancel={handleTurnoCancelado}
                    onContact={(email: string, name: string) => setContactModal({ show: true, clientEmail: email, clientName: name })}
                    onReschedule={(id: string, start: string) => {
                        setRescheduleModal({ show: true, turnoId: id, currentStart: start });
                        // Formatear para input datetime-local (YYYY-MM-DDTHH:MM)
                        const dateObj = new Date(start);
                        dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());
                        setNewDate(dateObj.toISOString().slice(0, 16));
                        }}
                />
            )}

            {/* --- OTRAS TABS --- */}
            {activeTab === "clientes" && <div className="animate-in fade-in"><h1 className="text-2xl font-bold mb-4">Base de Clientes</h1><ClientesTable turnos={turnos} setContactModal={setContactModal} /></div>}
            {/* --- TAB: PROMOCIONES --- */}
            {activeTab === "promociones" && <PromotionsTab initialConfig={negocio.config_web} negocioId={negocio.id} />}     
            {activeTab === "resenas" && <ReviewsTab resenas={reviews} onToggle={toggleVisibility}/>}
            {activeTab === "marketing" && <MarketingCampaign negocio={negocio} />}
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
            {activeTab === "configuracion" && <ConfigTab negocio={negocio} handleConnectGoogle={handleConnectGoogle} />}

            
        </div>
        {rescheduleModal.show && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                    <h3 className="text-lg font-bold mb-4">Reprogramar Turno</h3>
                    <p className="text-sm text-gray-500 mb-2">Selecciona la nueva fecha y hora:</p>
                    <input 
                        type="datetime-local"
                        className="w-full p-2 border rounded-lg mb-6"
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                    />
                    <div className="flex gap-3">
                        <button onClick={() => setRescheduleModal({ ...rescheduleModal, show: false })} className="flex-1 py-2 text-gray-600 font-medium">Cancelar</button>
                        <button onClick={handleRescheduleSave} className="flex-1 py-2 bg-zinc-900 text-white rounded-lg font-bold">Guardar</button>
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
      </main>
    </div>
  );
}

// --- SUBCOMPONENTES (Copia aquí los mismos subcomponentes que tenías: CalendarTab, SidebarItem, etc.) ---
// ... (Aquí pegas las funciones CalendarTab, ClientesTable, SidebarItem, etc. del archivo original)
// Para ahorrar espacio en la respuesta, asumo que copiarás las funciones auxiliares al final de este archivo.
// Asegúrate de exportar o definir CalendarTab, ClientesTable, etc. aquí dentro.

function CalendarTab({ negocio, turnos, handleConnectGoogle, onCancel, onContact, onReschedule }: any) {
    const [currentDate, setCurrentDate] = useState(new Date());
    const supabase = createClient(); 
    const router = useRouter();
    
    // NUEVO: Estado para saber qué menú está abierto (guarda el ID del turno)
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

    const handleDisconnect = async () => {
        const confirmacion = window.confirm("¿Estás seguro de que quieres desconectar Google Calendar? Dejarás de sincronizar tus turnos.");
        if (!confirmacion) return;
        try {
            const { error } = await supabase
                .from('negocios')
                .update({
                    google_calendar_connected: false,
                    google_access_token: null,
                    google_refresh_token: null,
                })
                .eq('id', negocio.id);
            if (error) throw error;
            window.location.reload(); 
        } catch (error: any) {
            alert("Error al desconectar: " + error.message);
        }
    };

    // Lógica para borrar desde el menú de 3 puntos
    const handleDeleteFromMenu = async (id: string) => {
        if(!confirm("¿Estás seguro de cancelar este turno? Se eliminará de Google Calendar.")) return;
        
        // LLAMADA AL SERVIDOR (Server Action)
        const res = await cancelBooking(id);

        if (res.success) {
            onCancel(id); // Actualizar UI visualmente
            alert("Turno cancelado correctamente.");
        } else {
            alert("Error al cancelar: " + res.error);
        }
    };

    if (!negocio.google_calendar_connected) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-[600px] flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-zinc-300 text-center p-8">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                    <CalendarIcon size={40} />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-2">Conecta tu Calendario</h2>
                <p className="text-zinc-500 max-w-md mb-8">
                    Para visualizar y gestionar tus turnos aquí, necesitamos sincronizar con tu Google Calendar. Es seguro y automático.
                </p>
                <button 
                    onClick={handleConnectGoogle}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-1"
                >
                    <LinkIcon size={18} /> Conectar con Google
                </button>
            </div>
        );
    }

    // Cálculos del calendario
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

    const prevWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() - 7);
        setCurrentDate(newDate);
    };

    const nextWeek = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + 7);
        setCurrentDate(newDate);
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.getDate() === today.getDate() && date.getMonth() === today.getMonth();
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-[calc(100vh-140px)] flex flex-col">
            {/* HEADER CALENDARIO */}
            <header className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Tu Calendario</h1>
                    <p className="text-zinc-500 text-sm">Gestiona tus turnos de la semana.</p>
                </div>
                <div className="flex items-center gap-4 bg-white p-1 rounded-xl border border-zinc-200 shadow-sm">
                    <button onClick={prevWeek} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600"><ChevronLeft size={20}/></button>
                    <span className="text-sm font-bold min-w-[140px] text-center capitalize">
                        {days[0].toLocaleDateString('es-AR', { month: 'long', day: 'numeric' })} - {days[6].toLocaleDateString('es-AR', { month: 'long', day: 'numeric' })}
                    </span>
                    <button onClick={nextWeek} className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-600"><ChevronRight size={20}/></button>
                </div>
            </header>

            {/* GRID SEMANAL */}
            <div className="flex-1 bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col">
                <div className="hidden md:grid grid-cols-7 border-b border-zinc-200 bg-zinc-50">
                    {days.map((day, i) => (
                        <div key={i} className={`py-4 text-center border-r border-zinc-100 last:border-0 ${isToday(day) ? 'bg-blue-50/50' : ''}`}>
                            <p className="text-xs font-bold text-zinc-400 uppercase mb-1">{day.toLocaleDateString('es-AR', { weekday: 'short' })}</p>
                            <div className={`text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isToday(day) ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-900'}`}>
                                {day.getDate()}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-7 overflow-y-auto min-h-[500px]">
                    {days.map((day, i) => {
                        const dayTurnos = turnos.filter((t: any) => {
                            const tDate = new Date(t.fecha_inicio);
                            return tDate.getDate() === day.getDate() && 
                                   tDate.getMonth() === day.getMonth() && 
                                   tDate.getFullYear() === day.getFullYear();
                        });

                        return (
                            <div key={i} className={`border-r border-zinc-100 last:border-0 p-2 space-y-2 ${isToday(day) ? 'bg-blue-50/10' : ''}`}>
                                
                                <div className={`md:hidden flex items-center gap-2 py-2 px-2 mb-2 rounded-lg ${isToday(day) ? 'bg-blue-50 text-blue-700' : 'bg-zinc-50 text-zinc-600'}`}>
                                    <span className="font-bold text-sm capitalize">{day.toLocaleDateString('es-AR', { weekday: 'long' })}</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isToday(day) ? 'bg-blue-200' : 'bg-zinc-200'}`}>
                                        {day.getDate()}
                                    </span>
                                </div>
                                
                                {dayTurnos.length === 0 && (
                                    <div className="md:hidden text-center py-4 text-xs text-zinc-300 italic">
                                        Sin actividad
                                    </div>
                                )}

                                {dayTurnos.map((t: any) => (
                                    <div key={t.id} className="bg-white p-3 rounded-lg border border-zinc-200 shadow-sm relative group border-l-4 border-l-indigo-500">

                                        {/* CABECERA: Hora y 3 PUNTITOS (Aquí está el cambio principal) */}
                                        <div className="flex justify-between items-start mb-1 relative">
                                            <p className="text-xs font-bold text-zinc-400 flex items-center gap-1">
                                                <Clock size={10}/> 
                                                {new Date(t.fecha_inicio).toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}
                                            </p>

                                            {/* BOTÓN 3 PUNTOS */}
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Si ya está abierto este, lo cierra. Si no, lo abre.
                                                    setActiveMenuId(activeMenuId === t.id ? null : t.id);
                                                }}
                                                className="text-zinc-400 hover:text-zinc-600 p-1 rounded-full hover:bg-zinc-100 transition-colors"
                                            >
                                                <MoreVertical size={14} />
                                            </button>

                                            {/* MENÚ DESPLEGABLE (Solo se ve si activeMenuId coincide) */}
                                            {activeMenuId === t.id && (
                                                <>
                                                    {/* Fondo invisible para cerrar clickeando afuera */}
                                                    <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)} />
                                                    
                                                    {/* El cuadrito del menú */}
                                                    <div className="absolute right-0 top-6 w-48 bg-white rounded-lg shadow-xl border border-zinc-100 z-20 py-1 animate-in fade-in zoom-in-95 duration-100 origin-top-right">
                                                        
                                                        <button 
                                                            onClick={() => {
                                                                onReschedule(t.id, t.fecha_inicio);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-indigo-600 flex items-center gap-2"
                                                        >
                                                            <Edit size={14} /> Reprogramar
                                                        </button>

                                                        <button 
                                                            onClick={() => {
                                                                onContact(t.cliente_email, t.cliente_nombre);
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-emerald-600 flex items-center gap-2"
                                                        >
                                                            <Mail size={14} /> Contactar Email
                                                        </button>
                                                        
                                                        {t.cliente_telefono && (
                                                            <a 
                                                                href={`https://wa.me/${t.cliente_telefono.replace(/\D/g,'')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
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
                                        </div>

                                        
                                        <p className="text-sm font-bold text-zinc-900 truncate pr-4">{t.cliente_nombre}</p>

                                        {t.servicio && t.servicio.includes(" - ") ? (
                                            <div className="flex flex-col mt-1">
                                                <p className="text-xs font-medium text-zinc-700 truncate">
                                                    {t.servicio.split(" - ")[0]}
                                                </p>
                                                <p className="text-[10px] text-zinc-400 flex items-center gap-1 truncate mt-0.5">
                                                    <User size={10}/> {t.servicio.split(" - ")[1]}
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-zinc-500 truncate">{t.servicio || "Reunión"}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
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
                <div className="hidden md:block">
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
                <div className="md:hidden divide-y divide-zinc-100">
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
function HorariosTab({ negocio }: any) {
    // Recuperamos la lista de trabajadores para el selector
    const workers = negocio.config_web?.equipo?.members || negocio.config_web?.equipo?.items || [];

    return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-8">
            <header className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                   Administrar Horarios
                </h2>
                <p className="text-zinc-500 text-sm">Gestiona la disponibilidad de tu equipo y bloqueos especiales.</p>
            </header>

            <section>
                <div className="flex items-center justify-between mb-4">
                     <h3 className="text-lg font-bold">Bloqueo de Fechas y Horas</h3>
                     {!negocio.google_calendar_connected && (
                         <span className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded-md">Requiere Google Calendar</span>
                     )}
                </div>
                
                {negocio.google_calendar_connected ? (
                    // Aquí usamos el componente que ya tenías importado
                    <BlockTimeManager slug={negocio.slug} workers={workers} />
                ) : (
                    <div className="p-8 bg-zinc-50 border border-zinc-200 border-dashed rounded-xl text-center">
                        <div className="w-12 h-12 bg-zinc-200 text-zinc-400 rounded-full flex items-center justify-center mx-auto mb-2">
                            <CalendarIcon size={24} />
                        </div>
                        <h4 className="font-bold text-zinc-900">Calendario desconectado</h4>
                        <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
                            Para bloquear horarios necesitas conectar Google Calendar en la pestaña de <b>Configuración</b>.
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}
function ConfigTab({ negocio, handleConnectGoogle }: any) {
    const supabase = createClient();
    

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
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-2xl space-y-12">
            
            {/* SECCIÓN 1: INTEGRACIONES (La que ya tenías) */}
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
    
    // Estado para el formulario de nueva promoción
    const [newPromo, setNewPromo] = useState({
        name: '',
        description: '',
        price: '',
        duration: '60',
        isPromo: true,
        promoEndDate: '' // Fecha límite (YYYY-MM-DD)
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
            setNewPromo({ ...newPromo, name: '', description: '', price: '', promoEndDate: '' });
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
                    
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Duración (min)</label>
                        <select 
                            className="p-2 border rounded-lg w-full bg-white"
                            value={newPromo.duration}
                            onChange={e => setNewPromo({...newPromo, duration: e.target.value})}
                        >
                            <option value="15">15 min</option>
                            <option value="30">30 min</option>
                            <option value="45">45 min</option>
                            <option value="60">1 hora</option>
                            <option value="90">1.5 horas</option>
                            <option value="120">2 horas</option>
                        </select>
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
                                    <div className="flex items-center gap-4 mt-2 text-xs font-medium">
                                        <span className="text-green-600 bg-green-50 px-2 py-1 rounded">${promo.price}</span>
                                        <span className="text-pink-600 bg-pink-50 px-2 py-1 rounded flex items-center gap-1">
                                            <Clock size={12}/> Vence: {promo.promoEndDate}
                                        </span>
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