"use client";
// components/dashboards/ModularDashboard.tsx

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams }        from "next/navigation";
import { createClient }                      from "@/lib/supabase";
import {
  Menu, X, LogOut, ExternalLink, Loader2, Pencil,
  LayoutDashboard, Bell, CreditCard, Settings, Puzzle,
  CalendarDays, Users, Star, MessageCircle, BarChart2,
  Megaphone, Images, Globe, ShoppingCart, GraduationCap,
} from "lucide-react";
import { rescheduleBooking }  from "@/app/actions/service-booking/calendar-actions";
import { approveAppointment } from "@/blocks/calendar/actions";
import { BLOCKS_REGISTRY }   from "@/blocks/_registry";
import ModularEditor         from "@/components/editors/ModularEditor";
import OnboardingWizard      from "@/components/onboarding/OnboardingWizard";
import type { BlockId, BlockSharedData } from "@/types/blocks";
import { useWhitelabel } from "@/lib/hooks/useWhitelabel";

const PRIMARY = "#577a2c"; // default — overridden by wl.primaryColor when isWhitelabel
// Effective primary color: use whitelabel override when available
// (applied after hook resolves via useEffect on CSS variable)
const BG      = "#eee9dd";

const ICON_MAP: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard size={18} />,
  Bell:            <Bell            size={18} />,
  CreditCard:      <CreditCard      size={18} />,
  Settings:        <Settings        size={18} />,
  Puzzle:          <Puzzle          size={18} />,
  CalendarDays:    <CalendarDays    size={18} />,
  Users:           <Users           size={18} />,
  Star:            <Star            size={18} />,
  MessageCircle:   <MessageCircle   size={18} />,
  BarChart2:       <BarChart2       size={18} />,
  Megaphone:       <Megaphone       size={18} />,
  Images:          <Images          size={18} />,
  Globe:           <Globe           size={18} />,
  ShoppingCart:    <ShoppingCart    size={18} />,
  GraduationCap:   <GraduationCap   size={18} />,
};

export default function ModularDashboard({ initialData }: { initialData: any }) {
  const supabase     = createClient();
  const router       = useRouter();
  const searchParams = useSearchParams();

  // ── Estado principal ───────────────────────────────────────────────────────
  const [negocio, setNegocio]           = useState<any>(initialData);
  const [turnos, setTurnos]             = useState<any[]>([]);
  const [resenas, setResenas]           = useState<any[]>([]);
  const [activeTenantIds, setActiveIds] = useState<BlockId[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<BlockId>("resumen");
  const [mobileOpen, setMobileOpen]     = useState(false);
  const [editorOpen, setEditorOpen]     = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const wl = useWhitelabel(initialData.id, initialData.agency_id ?? null);

  // Apply whitelabel primary color as CSS variable whenever it changes
  useEffect(() => {
    if (wl.isWhitelabel && wl.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', wl.primaryColor);
    }
  }, [wl.primaryColor, wl.isWhitelabel]);

  // ── Estado de modales del shell ────────────────────────────────────────────
  const [contactModal,    setContactModal]    = useState({ show: false, email: "", name: "" });
  const [rescheduleModal, setRescheduleModal] = useState({ show: false, id: "", start: "" });
  const [confirmModal,    setConfirmModal]    = useState({ show: false, id: "", price: "", duration: "" });
  const [newDate, setNewDate]                 = useState("");
  const [mailContent, setMailContent]         = useState({ subject: "", message: "" });
  const [isSending, setIsSending]             = useState(false);
  const [isConfirming, setIsConfirming]       = useState(false);

  // ── Carga de datos ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const [
      { data: dataNegocio },
      { data: dataTurnos },
      { data: dataResenas },
      { data: dataTenantBlocks },
    ] = await Promise.all([
      supabase.from("negocios").select("*").eq("id", initialData.id).single(),
      supabase.from("turnos").select("*").eq("negocio_id", initialData.id)
        .neq("estado", "cancelado").order("fecha_inicio", { ascending: false }),
      supabase.from("resenas").select("*").eq("negocio_id", initialData.id)
        .order("created_at", { ascending: false }),
      supabase.from("tenant_blocks").select("block_id")
        .eq("negocio_id", initialData.id).eq("active", true),
    ]);

    if (dataNegocio) {
      if (typeof dataNegocio.config_web === "string") {
        try { dataNegocio.config_web = JSON.parse(dataNegocio.config_web); }
        catch { dataNegocio.config_web = {}; }
      }
      setNegocio(dataNegocio);
    }
    if (dataTurnos)       setTurnos(dataTurnos);
    if (dataResenas)      setResenas(dataResenas);
    if (dataTenantBlocks) setActiveIds(dataTenantBlocks.map((b: any) => b.block_id as BlockId));
  }, [initialData.id]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      if (searchParams.get("google_connected") === "true") {
        setActiveTab("calendar");
        router.replace(window.location.pathname, { scroll: false });
      }
      await fetchData();
      setLoading(false);

      // Show the onboarding wizard for new negocios that have no active blocks yet.
      const { data: tenantBlocksCheck } = await createClient()
        .from('tenant_blocks')
        .select('block_id')
        .eq('negocio_id', initialData.id)
        .eq('active', true);
      const hasNoBlocks = !tenantBlocksCheck || tenantBlocksCheck.length === 0;
      const alreadyDone = typeof window !== 'undefined'
        && !!localStorage.getItem(`unitpro_onboarding_done_${initialData.id}`);
      if (hasNoBlocks && !alreadyDone) {
        setShowOnboarding(true);
      }
    }
    init();
  }, []);

  useEffect(() => {
  let channel: ReturnType<typeof supabase.channel> | null = null;

  const setup = async () => {
    // Obtener JWT para el WebSocket (las cookies no viajan por WS)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      supabase.realtime.setAuth(session.access_token);
    }

    channel = supabase
      .channel('turnos-realtime')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'turnos', filter: `negocio_id=eq.${initialData.id}` },
        () => { fetchData(); }
      )
      .subscribe((status) => {
        console.log('[REALTIME]', status);
      });
  };

  setup();

  // Renovar token cuando cambia la sesión
  const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
    }
  );

  return () => {
    if (channel) supabase.removeChannel(channel);
    authSub.unsubscribe();
  };
}, [initialData.id, fetchData]);

  // ── sharedData ─────────────────────────────────────────────────────────────
  const sharedData: BlockSharedData = {
    turnos,
    resenas,
    setTurnos,
    setResenas,
    fetchData,
    handleConnectGoogle: () => {
      if (negocio?.slug) window.location.href = `/api/google/auth?slug=${negocio.slug}`;
    },
    openContactModal: (email, name) =>
      setContactModal({ show: true, email, name }),
    openRescheduleModal: (id, currentStart) => {
      const d = new Date(currentStart);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setNewDate(d.toISOString().slice(0, 16));
      setRescheduleModal({ show: true, id, start: currentStart });
    },
    openConfirmModal: (id, precio, duracion) =>
      setConfirmModal({ show: true, id, price: String(precio), duration: String(duracion) }),
  };

  // Negocio autogestionado: sin agencia intermediaria → acceso total sin filtros de permiso
  const isAutogestionado = !negocio.agency_id;
  // Negocio directo → siempre puede editar.
  // Negocio via agencia → solo si la agencia habilitó editor_enabled.
  const canEditPage = !negocio.agency_id || negocio.editor_enabled === true;

  // ── Tabs desde el registry ─────────────────────────────────────────────────
  // Para negocios autogestionados se muestran todos los bloques disponibles sin
  // requerir que estén en tenant_blocks. Para negocios con agencia se aplica
  // el filtro habitual de activeTenantIds + block_edit_permissions.
  const tabs = Object.values(BLOCKS_REGISTRY)
  .filter(def => {
    if (!def.AdminComponent) return false;

    // Negocios con agencia: respetar block_edit_permissions SIEMPRE
    if (!isAutogestionado) {
      const blockPermsMap = negocio.block_edit_permissions as Record<string, boolean> | undefined;
      if (blockPermsMap && blockPermsMap[def.id] === false) return false;
    }

    if (def.alwaysActive)    return true;
    if (isAutogestionado)    return true;
    if (!activeTenantIds.includes(def.id)) return false;
    return true;
  })
  .filter(def =>
    def.sidebarVisible ? def.sidebarVisible(sharedData, negocio) : true
  )
  .sort((a, b) => (a.adminOrder ?? 99) - (b.adminOrder ?? 99));

  // ── Acciones globales ──────────────────────────────────────────────────────
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleRescheduleSave = async () => {
    if (!newDate) return alert("Seleccioná una fecha válida.");
    const res = await rescheduleBooking(rescheduleModal.id, new Date(newDate).toISOString());
    if (!res.success) alert("Error al reprogramar: " + res.error);
    else {
      setTurnos(prev => prev.map(t =>
        t.id === rescheduleModal.id ? { ...t, fecha_inicio: newDate } : t
      ));
      setRescheduleModal({ ...rescheduleModal, show: false });
    }
  };

  const handleConfirmSave = async () => {
    setIsConfirming(true);
    const res = await approveAppointment(
      confirmModal.id,
      Number(confirmModal.price) || 0,
      Number(confirmModal.duration) || undefined
    );
    if (!res.success) alert("Error: " + res.error);
    else await fetchData();
    setIsConfirming(false);
    setConfirmModal({ ...confirmModal, show: false });
  };

  const handleSendEmail = async () => {
    setIsSending(true);
    try {
      const res = await fetch("/api/google/send-email", {
        method: "POST",
        body: JSON.stringify({
          to: contactModal.email,
          subject: mailContent.subject,
          message: mailContent.message,
          negocioId: initialData.id,
        }),
      });
      if (res.ok) { alert("Email enviado."); setContactModal({ ...contactModal, show: false }); }
      else alert("Error al enviar. ¿Tenés Gmail conectado?");
    } catch { alert("Error de red."); }
    setIsSending(false);
  };

  // ── Onboarding wizard ─────────────────────────────────────────────────────
  if (showOnboarding) {
    return (
      <OnboardingWizard
        negocio={negocio}
        onComplete={() => {
          setShowOnboarding(false);
          fetchData();
        }}
      />
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="h-full w-full flex items-center justify-center min-h-[500px]" style={{ backgroundColor: BG }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
        <p className="text-zinc-400 text-sm animate-pulse">Cargando panel...</p>
      </div>
    </div>
  );

  const ActiveAdmin = BLOCKS_REGISTRY[activeTab]?.AdminComponent;
  const activeConfig = {};
  const logoSrc = wl.isWhitelabel
    ? (wl.logoUrl || negocio.config_web?.metadata?.faviconURL || negocio.config_web?.logoUrl)
    : (negocio.config_web?.metadata?.faviconURL || negocio.config_web?.logoUrl);
  const nombre  = negocio.config_web?.hero?.titulo || negocio.nombre;
  const platformName = wl.isWhitelabel ? wl.platformName : 'UnitPro';

  // Negocio directo → siempre puede editar.
  // Negocio via agencia → solo si la agencia habilitó editor_enabled.

  // ── SidebarItem ────────────────────────────────────────────────────────────
  const SidebarItem = ({ def }: { def: typeof tabs[0] }) => {
    const badge    = def.sidebarBadge?.(sharedData, negocio);
    const isActive = activeTab === def.id;
    return (
      <button
        onClick={() => { setActiveTab(def.id); setMobileOpen(false); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? "text-white shadow-sm" : "text-zinc-600 hover:bg-zinc-100/60"}`}
        style={isActive ? { backgroundColor: wl.isWhitelabel ? wl.primaryColor : PRIMARY } : {}}>
        <span className="shrink-0">{ICON_MAP[def.icon] ?? <Puzzle size={18} />}</span>
        <span className="flex-1 text-left">{def.name}</span>
        {badge !== undefined && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge === "!" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-600"}`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans text-zinc-900 overflow-hidden" style={{ backgroundColor: BG }}>

      {/* ── Navbar móvil ─────────────────────────────────────────────────── */}
      <div className="lg:hidden h-16 px-4 flex justify-between items-center sticky top-0 z-40 shadow-sm shrink-0 border-b border-zinc-200"
        style={{ backgroundColor: BG }}>
        <div className="flex items-center gap-2">
          {logoSrc ? (
            <img src={logoSrc} alt="Logo" className="w-8 h-8 object-contain rounded-md" />
          ) : (
            <div className="w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ backgroundColor: wl.isWhitelabel ? wl.primaryColor : PRIMARY }}>
              {negocio.nombre?.substring(0, 1)}
            </div>
          )}
          <span className="font-bold tracking-tight text-sm truncate max-w-[150px]">{nombre}</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-lg">
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* ── Menú móvil overlay ───────────────────────────────────────────── */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-30 bg-black/20 top-16" onClick={() => setMobileOpen(false)} />
          <div className="lg:hidden fixed top-16 left-0 w-full bg-white z-40 border-b border-zinc-200 shadow-2xl p-2 flex flex-col gap-1 animate-in slide-in-from-top-2 duration-200">
            {tabs.map(def => <SidebarItem key={def.id} def={def} />)}
            <div className="h-px bg-zinc-100 my-1" />
            {canEditPage && (
              <button
                onClick={() => { setEditorOpen(true); setMobileOpen(false); }}
                className="flex items-center gap-3 p-3 rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: wl.isWhitelabel ? wl.primaryColor : PRIMARY }}>
                <Pencil size={18} /> Editar Página
              </button>
            )}
            <button onClick={handleLogout}
              className="flex items-center gap-3 p-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50">
              <LogOut size={18} /> Cerrar sesión
            </button>
          </div>
        </>
      )}

      {/* ── Sidebar desktop ──────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-zinc-200 min-h-screen sticky top-0 shrink-0"
        style={{ backgroundColor: BG }}>
        <div className="p-6">
          <div className="flex items-center gap-3 px-2 mb-8">
            {logoSrc ? (
              <img src={logoSrc} alt="Logo" className="w-9 h-9 object-contain rounded-md" />
            ) : (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                style={{ backgroundColor: wl.isWhitelabel ? wl.primaryColor : PRIMARY }}>
                {negocio.nombre?.substring(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{nombre}</p>
              <a href={`/${negocio.slug}`} target="_blank"
                className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1 truncate">
                Ver web <ExternalLink size={10} />
              </a>
            </div>
          </div>

          <nav className="space-y-1">
            {tabs.map(def => <SidebarItem key={def.id} def={def} />)}
          </nav>
        </div>

        <div className="mt-auto p-6 space-y-2 border-t border-zinc-100">
          {canEditPage && (
            <button
              onClick={() => setEditorOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: wl.isWhitelabel ? wl.primaryColor : PRIMARY }}>
              <Pencil size={16} /> Editar Página
            </button>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-zinc-400 hover:text-red-600 text-sm font-medium transition-colors w-full px-2 py-1.5">
            <LogOut size={16} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ── Contenido ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto p-6 lg:p-10">
          {tabs.map((def) => {
            const AdminComponent = def.AdminComponent;
            // Si el bloque no tiene componente de admin, lo saltamos
            if (!AdminComponent) return null;

            // Renderizamos todos los componentes, pero ocultamos los que no son la tab activa
            // Esto evita que se destruyan y se vuelvan a descargar al cambiar de tab
            return (
              <div
                key={def.id}
                className={activeTab === def.id ? "block" : "hidden"}
              >
                <AdminComponent
                  negocio={negocio}
                  config={activeConfig}
                  sharedData={sharedData}
                />
              </div>
            );
          })}

          {/* Fallback por si la tab activa no tiene componente (caso raro dado el filtro) */}
          {!BLOCKS_REGISTRY[activeTab]?.AdminComponent && (
            <div className="p-12 text-center text-zinc-400 bg-white rounded-2xl border border-dashed border-zinc-200">
              Esta sección no tiene panel de administración aún.
            </div>
          )}
        </div>
      </main>

      {/* ── Modal: Reprogramar turno ─────────────────────────────────────── */}
      {rescheduleModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-2">Reprogramar Turno</h3>
            <p className="text-sm text-zinc-500 mb-4">Seleccioná la nueva fecha y hora:</p>
            <input type="datetime-local" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="w-full p-3 border border-zinc-200 rounded-xl text-sm outline-none mb-4" />
            <div className="flex gap-3">
              <button onClick={() => setRescheduleModal({ ...rescheduleModal, show: false })}
                className="flex-1 py-2.5 font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={handleRescheduleSave}
                className="flex-1 py-2.5 font-bold text-white rounded-xl transition-colors"
                style={{ backgroundColor: wl.isWhitelabel ? wl.primaryColor : PRIMARY }}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar con precio ───────────────────────────────────── */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4">Confirmar Turno</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-1">Precio final ($)</label>
                <input type="number" value={confirmModal.price}
                  onChange={e => setConfirmModal(p => ({ ...p, price: e.target.value }))}
                  placeholder="0"
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 block mb-1">Duración (min)</label>
                <input type="number" value={confirmModal.duration}
                  onChange={e => setConfirmModal(p => ({ ...p, duration: e.target.value }))}
                  placeholder="60"
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setConfirmModal({ ...confirmModal, show: false })}
                className="flex-1 py-2.5 font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={handleConfirmSave} disabled={isConfirming}
                className="flex-1 py-2.5 font-bold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                style={{ backgroundColor: wl.isWhitelabel ? wl.primaryColor : PRIMARY }}>
                {isConfirming ? <Loader2 size={16} className="animate-spin" /> : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Enviar email ───────────────────────────────────────────── */}
      {contactModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-1">Enviar Email</h3>
            <p className="text-sm text-zinc-500 mb-4">
              Para: <span className="font-bold text-zinc-700">{contactModal.name}</span> ({contactModal.email})
            </p>
            <div className="space-y-3">
              <input placeholder="Asunto" value={mailContent.subject}
                onChange={e => setMailContent(p => ({ ...p, subject: e.target.value }))}
                className="w-full p-3 border border-zinc-200 rounded-xl text-sm outline-none" />
              <textarea placeholder="Mensaje..." value={mailContent.message}
                onChange={e => setMailContent(p => ({ ...p, message: e.target.value }))}
                rows={4} className="w-full p-3 border border-zinc-200 rounded-xl text-sm outline-none resize-none" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setContactModal({ ...contactModal, show: false })}
                className="flex-1 py-2.5 font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={handleSendEmail} disabled={isSending}
                className="flex-1 py-2.5 font-bold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                style={{ backgroundColor: wl.isWhitelabel ? wl.primaryColor : PRIMARY }}>
                {isSending ? <Loader2 size={16} className="animate-spin" /> : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Editor de página (overlay fullscreen) ────────────────────────── */}
      {editorOpen && (
        <ModularEditor
          negocio={negocio}
          onClose={() => setEditorOpen(false)}
          onSaved={fetchData}
        />
      )}
    </div>
  );
}