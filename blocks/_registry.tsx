// blocks/_registry.tsx
//
// ÚNICA fuente de verdad de todos los bloques.
// ModularDashboard y LandingModular leen de acá — nunca tienen if/else por bloque.
//
// Para agregar un bloque nuevo:
//   1. Añadir el ID a BlockId en types/blocks.ts
//   2. Crear el AdminComponent en blocks/<id>/admin/<Id>Admin.tsx
//   3. Agregar la entrada acá (adminOrder define el orden en el sidebar)

import type { BlockDefinition, BlockId, BlockSharedData } from '@/types/blocks';

import dynamic from 'next/dynamic';

// ── SectionComponents (landing pública) — con SSR para Server Components ──────
const HeroSection     = dynamic(() => import('@/blocks/landing/public/HeroSection'));
const AboutSection    = dynamic(() => import('@/blocks/about/public/AboutSection'));
const CalendarSection = dynamic(() => import('@/blocks/calendar/public/CalendarSection'));
const EquipoSection = dynamic(() => import('@/blocks/equipo/public/EquipoSection'));
const GallerySection  = dynamic(() => import('@/blocks/gallery/public/GallerySection'));
const ReviewsSection  = dynamic(() => import('@/blocks/reviews/public/ReviewsSection'));
const ContactSection  = dynamic(() => import('@/blocks/crm/public/ContactSection'));
const ShopSection     = dynamic(() => import('@/blocks/shop/public/ShopSection'));
const AcademySection  = dynamic(() => import('@/blocks/academy/public/AcademySection'));

// ── AdminComponents (tabs del dashboard) ─────────────────────────────────────
// ssr: false no se puede usar acá porque _registry.tsx es importado por LandingModular.tsx (Server Component).
// dynamic() sin opciones igual resuelve el TDZ haciendo lazy loading / code splitting.
const ResumenAdmin       = dynamic(() => import('@/blocks/platform/admin/ResumenAdmin'));
const SolicitudesAdmin   = dynamic(() => import('@/blocks/platform/admin/SolicitudesAdmin'));
//const SuscripcionAdmin   = dynamic(() => import('@/blocks/platform/admin/SuscripcionAdmin'));
const ConfiguracionAdmin = dynamic(() => import('@/blocks/platform/admin/ConfiguracionAdmin'));
const BloquesAdmin       = dynamic(() => import('@/blocks/platform/admin/BloquesAdmin'));
const CalendarAdmin      = dynamic(() => import('@/blocks/calendar/admin/CalendarAdmin'));
const CrmAdmin           = dynamic(() => import('@/blocks/crm/admin/CrmAdmin'));
const ReviewsAdmin       = dynamic(() => import('@/blocks/reviews/admin/ReviewsAdmin'));
const AnalyticsAdmin     = dynamic(() => import('@/blocks/analytics/admin/AnalyticsAdmin'));
const MarketingAdmin     = dynamic(() => import('@/blocks/marketing/admin/MarketingAdmin'));
const ShopAdmin          = dynamic(() => import('@/blocks/shop/admin/ShopAdmin'));
const AcademyAdmin       = dynamic(() => import('@/blocks/academy/admin/AcademyAdmin'));

// ── EditorPanels (ModularEditor) ──────────────────────────────────────────────
const LandingPanel  = dynamic(() => import('@/blocks/landing/editor/LandingPanel'));
const AboutPanel    = dynamic(() => import('@/blocks/about/editor/AboutPanel'));
const CalendarPanel = dynamic(() => import('@/blocks/calendar/editor/CalendarPanel'));
const EquipoPanel = dynamic(() => import('@/blocks/equipo/editor/EquipoPanel'));
const CrmPanel      = dynamic(() => import('@/blocks/crm/editor/CrmPanel'));
const GalleryPanel  = dynamic(() => import('@/blocks/gallery/editor/GalleryPanel'));
const ShopPanel     = dynamic(() => import('@/blocks/shop/editor/ShopPanel'));
const AcademyPanel  = dynamic(() => import('@/blocks/academy/editor/AcademyPanel'));

// ─── Lógica de visibilidad para "solicitudes" ─────────────────────────────────
function solicitudesVisible(shared: BlockSharedData, negocio: any): boolean {
  const hayTurnos = shared.turnos.some(
    t => t.estado === 'pendiente' || t.estado === 'esperando_senia'
  );
  if (hayTurnos) return true;
  let cfg = negocio?.config_web || {};
  if (typeof cfg === 'string') { try { cfg = JSON.parse(cfg); } catch { cfg = {}; } }
  if (!cfg.booking) return false;
  const pideSena   = cfg.booking.requestDeposit            === true || cfg.booking.requestDeposit            === 'true';
  const pideManual = cfg.booking.requireManualConfirmation  === true || cfg.booking.requireManualConfirmation  === 'true';
  return pideSena || pideManual;
}

// ─── Registry ─────────────────────────────────────────────────────────────────
export const BLOCKS_REGISTRY: Record<BlockId, BlockDefinition> = {

  // ── PLATFORM ─────────────────────────────────────────────────────────────
  resumen: {
    id: 'resumen', name: 'General', description: 'Resumen de actividad.',
    category: 'platform', priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0, dependencies: [],
    icon: 'LayoutDashboard', available: true,
    alwaysActive: true, adminOrder: 1,
    AdminComponent: ResumenAdmin,
  },
  solicitudes: {
    id: 'solicitudes', name: 'Solicitudes', description: 'Confirmaciones manuales y cobro de seña.',
    category: 'platform', priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0, dependencies: [],
    icon: 'Bell', available: true,
    alwaysActive: true, adminOrder: 4,
    sidebarVisible: solicitudesVisible,
    sidebarBadge: (shared) => {
      const n = shared.turnos.filter(t => t.estado === 'pendiente' || t.estado === 'esperando_senia').length;
      return n > 0 ? n : undefined;
    },
    AdminComponent: SolicitudesAdmin,
  },
  suscripcion: {
    id: 'suscripcion', name: 'Suscripción', description: 'Gestión de plan y facturación.',
    category: 'platform', priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0, dependencies: [],
    icon: 'CreditCard', available: true,
    alwaysActive: true, adminOrder: 9,
    //AdminComponent: SuscripcionAdmin,
  },
  bloques: {
    id: 'bloques', name: 'Mis Bloques', description: 'Activá funcionalidades y configurá el orden de secciones.',
    category: 'platform', priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0, dependencies: [],
    icon: 'Puzzle', available: true,
    alwaysActive: true, adminOrder: 10,
    AdminComponent: BloquesAdmin,
  },
  configuracion: {
    id: 'configuracion', name: 'Configuración', description: 'Dominio, integraciones y seguridad.',
    category: 'platform', priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0, dependencies: [],
    icon: 'Settings', available: true,
    alwaysActive: true, adminOrder: 11,
    AdminComponent: ConfiguracionAdmin,
  },

  // ── CORE ─────────────────────────────────────────────────────────────────
  landing: {
    id: 'landing', name: 'Landing Page', description: 'Página pública del negocio.',
    category: 'core', priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0, dependencies: [],
    icon: 'Globe', available: true,
    SectionComponent: HeroSection,
    // EditorPanel engloba identidad + apariencia + portada (siempre visible en editor)
    editorLabel: 'Apariencia & Portada',
    EditorPanel: LandingPanel,
  },

  about: {
    id: 'about', name: 'Quiénes Somos',
    description: 'Sección de presentación con título, texto e imagen.',
    category: 'core', priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0, dependencies: ['landing'],
    icon: 'Users', available: true,
    SectionComponent: AboutSection,
    editorLabel: 'Quiénes Somos',
    EditorPanel: AboutPanel,
  },

  // ── FUNCIONALES ───────────────────────────────────────────────────────────
  calendar: {
    id: 'calendar', name: 'Turnos & Calendario',
    description: 'Reservas online, calendario semanal, gestión de horarios y promociones.',
    category: 'services', priceARS: 2500, agencyPriceARS: 1750, priceUC: 25, agencyPriceUC: 18, dependencies: ['landing'],
    icon: 'CalendarDays', available: true, adminOrder: 2,
    sidebarBadge: (_, negocio) => !negocio.google_calendar_connected ? '!' : undefined,
    SectionComponent: CalendarSection,
    AdminComponent:   CalendarAdmin,
    editorLabel: 'Servicios',
    EditorPanel: CalendarPanel,
  },
  equipo: {
    id: 'equipo', name: 'Equipo',
    description: 'Sección de profesionales y equipo de trabajo.',
    category: 'services', priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0,
    dependencies: ['calendar'],
    icon: 'Users', available: true, adminOrder: 99,
    SectionComponent: EquipoSection,
    editorLabel: 'Equipo / Profesionales',
    EditorPanel: EquipoPanel,
  },
  crm: {
    id: 'crm', name: 'Clientes',
    description: 'Base de clientes, historial y contacto directo.',
    category: 'services', priceARS: 1500, agencyPriceARS: 1050, priceUC: 15, agencyPriceUC: 11, dependencies: [],
    icon: 'Users', available: true, adminOrder: 3,
    SectionComponent: ContactSection,
    AdminComponent:   CrmAdmin,
    editorLabel: 'Contacto & Redes',
    EditorPanel: CrmPanel,
  },
  reviews: {
    id: 'reviews', name: 'Valoraciones', description: 'Reseñas y valoraciones de clientes.',
    category: 'services', priceARS: 700, agencyPriceARS: 490, priceUC: 7, agencyPriceUC: 5, dependencies: [],
    icon: 'Star', available: true, adminOrder: 5,
    SectionComponent: ReviewsSection,
    AdminComponent:   ReviewsAdmin,
  },
  gallery: {
    id: 'gallery', name: 'Galería', description: 'Galería visual de trabajos o portfolio.',
    category: 'services', priceARS: 800, agencyPriceARS: 560, priceUC: 8, agencyPriceUC: 6, dependencies: [],
    icon: 'Images', available: true, adminOrder: 6,
    SectionComponent: GallerySection,
    editorLabel: 'Galería de Imágenes',
    EditorPanel: GalleryPanel,
  },
  analytics: {
    id: 'analytics', name: 'Analytics', description: 'Métricas de visitas y conversión.',
    category: 'marketing', priceARS: 1500, agencyPriceARS: 1050, priceUC: 15, agencyPriceUC: 11, dependencies: [],
    icon: 'BarChart2', available: true, adminOrder: 7,
    AdminComponent: AnalyticsAdmin,
  },
  marketing: {
    id: 'marketing', name: 'Marketing', description: 'Campañas y comunicación con clientes.',
    category: 'marketing', priceARS: 1000, agencyPriceARS: 700, priceUC: 10, agencyPriceUC: 7, dependencies: [],
    icon: 'Megaphone', available: true, adminOrder: 8,
    AdminComponent: MarketingAdmin,
  },
  payments: {
    id: 'payments', name: 'Pagos', description: 'Gestión de pagos y cobros online. Próximamente: integración con Stripe y MercadoPago.',
    category: 'commerce', priceARS: 2000, agencyPriceARS: 1400, priceUC: 20, agencyPriceUC: 14, dependencies: [],
    icon: 'CreditCard', available: true, comingSoon: true,
  },
  chat: {
    id: 'chat', name: 'Chat', description: 'Chat en tiempo real con visitantes.',
    category: 'marketing', priceARS: 1000, agencyPriceARS: 700, priceUC: 10, agencyPriceUC: 7, dependencies: [],
    icon: 'MessageCircle', available: false,
  },
  shop: {
    id: 'shop', name: 'Tienda Online', description: 'Catálogo de productos y carrito.',
    category: 'commerce', priceARS: 4000, agencyPriceARS: 2800, priceUC: 40, agencyPriceUC: 28,
    // TODO: restaurar dependencies: ['payments'] cuando el bloque esté live
    dependencies: [],
    icon: 'ShoppingCart', available: true,
    adminOrder: 8,
    SectionComponent: ShopSection,
    AdminComponent:   ShopAdmin,
    editorLabel: 'Tienda',
    EditorPanel: ShopPanel,
  },
  academy: {
    id: 'academy', name: 'Academia', description: 'Cursos y contenido educativo.',
    category: 'commerce', priceARS: 3500, agencyPriceARS: 2450, priceUC: 35, agencyPriceUC: 25,
    // TODO: restaurar dependencies: ['payments'] cuando el bloque esté live
    dependencies: [],
    icon: 'GraduationCap', available: true,
    adminOrder: 12,
    SectionComponent: AcademySection,
    AdminComponent:   AcademyAdmin,
    editorLabel: 'Academia & Cursos',
    EditorPanel: AcademyPanel,
  },
};
// ─── Helpers del registry ─────────────────────────────────────────────────────

export function getAvailableBlocks() {
  return Object.values(BLOCKS_REGISTRY).filter(b => b.available);
}

export function getBlocksByCategory() {
  return getAvailableBlocks().reduce((acc, block) => {
    if (!acc[block.category]) acc[block.category] = [];
    acc[block.category].push(block);
    return acc;
  }, {} as Record<string, BlockDefinition[]>);
}

/** Calcular precio efectivo en ARS (legacy) */
export function getBlockPrice(blockId: BlockId, isAgency = false): number {
  const block = BLOCKS_REGISTRY[blockId];
  return isAgency ? block.agencyPriceARS : block.priceARS;
}

/** Calcular precio efectivo en UnitCoins */
export function getBlockPriceUC(blockId: BlockId, isAgency = false): number {
  const block = BLOCKS_REGISTRY[blockId];
  return isAgency ? block.agencyPriceUC : block.priceUC;
}

/** Total mensual en ARS de una lista de bloques activos */
export function calculateMonthlyTotal(activeBlockIds: BlockId[], isAgency = false): number {
  return activeBlockIds.reduce((total, id) => total + getBlockPrice(id, isAgency), 0);
}

/** Verificar si las dependencias de un bloque están cubiertas */
export function checkDependencies(
  blockId: BlockId,
  activeBlockIds: BlockId[]
): { satisfied: boolean; missing: BlockId[] } {
  const { dependencies } = BLOCKS_REGISTRY[blockId];
  const missing = dependencies.filter(dep => !activeBlockIds.includes(dep));
  return { satisfied: missing.length === 0, missing };
}