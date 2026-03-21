// types/web-config.ts

export type TemplateTheme = 'modern' | 'minimal' | 'bold';

// --- BLOQUE: HERO (PORTADA) ---
export interface HeroSection {
  mostrar: boolean;
  titulo: string;
  subtitulo: string;
  ctaTexto: string;
  imagenUrl?: string; // URL de la imagen de fondo (desde Supabase Storage)
  
  layout?: 'split' | 'full';  // Define si es dividido o pantalla completa
  parallax?: boolean;         // Activa el efecto de movimiento
  overlayOpacity?: number;    // Opacidad del fondo oscuro (0-100)
}


export interface ServiceItem {
  titulo: string;
  desc: string;
  precio?: string;       
  duracion: number;      // En minutos,
  imagenUrl?: string;
  isPromo?: boolean;
  promoEndDate?: string | null;    
  workerIds?: string[];  // NUEVO: Arreglo para guardar los IDs de los profesionales asignados
}


export interface ServicesSection {
  mostrar: boolean;
  titulo: string;
  items: ServiceItem[]; 
}


export interface ProjectItem {
  titulo: string;
  descripcion: string;
  imagenUrl: string; // Fundamental en un portfolio
  tags?: string[];   // Ej: ["React", "Diseño", "SEO"]
  linkVerMas?: string; // Link al proyecto real o Behance
}

export interface ProjectsSection {
  mostrar: boolean;
  titulo: string;
  subtitulo?: string;
  items: ProjectItem[];
}


// --- BLOQUE: TESTIMONIOS ---
export interface TestimonialItem {
  nombre: string;
  cargo?: string;
  comentario: string;
  avatarUrl?: string; // URL de la foto del cliente (opcional)
}

export interface TestimonialsSection {
  mostrar: boolean;
  titulo: string;
  items: TestimonialItem[];
}

export interface AboutSection {
  id: string;
  type: 'about';
  titulo: string;
  texto: string;
  imagenUrl?: string;
}

// 2. Sección "Galería / Nuestros Trabajos"
export interface GalleryItem {
  url: string;
  descripcion?: string;
}

export interface GallerySection {
  id: string;
  type: 'gallery';
  titulo: string;
  imagenes: GalleryItem[];
}

export interface WorkerItem {
  id: string;          // Identificador único (importante para la selección)
  nombre: string;
  cargo: string;
  imagenUrl?: string;
  email?: string;
  paymentLink?: string;
  aliasCvu?: string;           // Alias/CVU/CBU del trabajador
  telefono?: string;           // Teléfono del trabajador
  instagram?: string;
  schedule?: WeeklySchedule;
  allowSimultaneous?: boolean;       // Si puede atender más de una persona a la vez
  simultaneousCapacity?: number;     // Cuántos turnos simultáneos puede atender
}

export interface TeamSection {
  mostrar: boolean;
  titulo: string;
  subtitulo?: string;
  items: WorkerItem[];
  availabilityMode?: 'global' | 'per_worker' | 'sala_unica' | 'simultaneo';
  scheduleType?: 'unified' | 'per_worker';
}
// Union Type para las secciones personalizadas
export type CustomSection = AboutSection | GallerySection;
// --- BLOQUE: FOOTER (PIE DE PÁGINA) ---
export interface FooterSection {
  mostrar: boolean;
  textoCopyright: string;
  redesSociales?: {
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    whatsapp?: string;
  };
}
export interface LocationSection {
  mostrar: boolean;
}
export interface BookingConfig {
  requestDeposit: boolean;           // ¿Pide seña?
  depositPercentage?: number;        // Porcentaje de seña (ej: 50)
  requireManualConfirmation?: boolean;
}
export interface EmailTemplate {
  enabled: boolean;
  subject: string;
  body: string;
  whatsappBody?: string; 
  bannerUrl?: string; // Imagen de cabecera
  sendViaEmail?: boolean;      // NUEVO: Switch para Email
  sendViaWhatsapp?: boolean;   // NUEVO: Switch para WhatsApp
}

export interface NotificationConfig {
  confirmation: EmailTemplate;
  reminder: EmailTemplate;
  deposit?: EmailTemplate;
  cancellation?: EmailTemplate // Para señas
}

export interface SiteMetadata {
  title?: string;
  description?: string;
  faviconUrl?: string;
}
// ------------------------------------
// LA CONFIGURACIÓN MAESTRA (WEB CONFIG)
// ------------------------------------
export interface WebConfig {
  template: TemplateTheme;
  logoUrl?: string; // URL del logo del negocio (desde Supabase Storage)
  
 
  appearance?: {
    font: string;
    radius: string;
  };

  colors: {
    primary: string;
    secondary?: string;
    text?: string;
    background?: string;
    accent?: string;
  };
  

  // Secciones de la Landing Page
  hero: HeroSection;
  proyectos?: ProjectsSection;
  servicios?: ServicesSection;
  services?: ServiceItem[];
  equipo?: TeamSection;
  ubicacion?: LocationSection;
  testimonios?: TestimonialsSection; // Opcional
  footer?: FooterSection;            // Opcional
  customSections?: CustomSection[];
  sectionOrder?: string[];
  schedule?: WeeklySchedule;
  booking?: BookingConfig;
  notifications?: NotificationConfig;
  metadata?: SiteMetadata;
}

export interface TimeRange {
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
}

export type DailySchedule = {
  isOpen: boolean;
  // Reemplazamos 'start' y 'end' simples por un array de rangos
  ranges: TimeRange[]; 
};

export type WeeklySchedule = {
  [key: string]: DailySchedule; 
};