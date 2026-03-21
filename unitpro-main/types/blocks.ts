// types/blocks.ts
import { ComponentType, Dispatch, SetStateAction } from 'react';

// ─── Datos compartidos para AdminComponent ────────────────────────────────────
export interface BlockSharedData {
  turnos:              any[];
  resenas:             any[];
  setTurnos:           Dispatch<SetStateAction<any[]>>;
  setResenas:          Dispatch<SetStateAction<any[]>>;
  fetchData:           () => Promise<void>;
  handleConnectGoogle: () => void;
  openContactModal:    (email: string, name: string) => void;
  openRescheduleModal: (id: string, currentStart: string) => void;
  openConfirmModal:    (id: string, precio: number | string, duracion: number | string) => void;
}

// ─── Props landing pública ────────────────────────────────────────────────────
export interface BlockSectionProps {
  negocio: any;
  config:  Record<string, unknown>;
}

// ─── Props AdminComponent (tab dashboard) ────────────────────────────────────
export interface BlockAdminProps {
  negocio:    any;
  config:     Record<string, unknown>;
  sharedData: BlockSharedData;
}

// ─── Props EditorPanel (editor de página) ────────────────────────────────────
// Cada bloque recibe el config_web completo y los helpers para mutarlo.
// ModularEditor es el único que llama a Supabase — los paneles solo llaman a los helpers.
export interface BlockEditorProps {
  negocio:          any;
  config:           any;   // config_web working copy
  dbFields:         any;   // columnas DB working copy (direccion, whatsapp, etc.)
  updateConfig:     (section: string, field: string, value: any) => void;
  updateConfigRoot: (field: string, value: any) => void;
  updateArray:      (section: string, index: number, field: string, value: any) => void;
  pushToArray:      (section: string, item: any) => void;
  removeFromArray:  (section: string, index: number) => void;
  updateDb:         (field: string, value: any) => void;
  editorMode?:      'easy' | 'pro';
}

// ─── IDs ──────────────────────────────────────────────────────────────────────
export type BlockId =
  | 'resumen' | 'solicitudes' | 'suscripcion' | 'configuracion' | 'bloques'
  | 'landing' | 'about'
  | 'calendar' | 'crm' | 'gallery' | 'reviews'
  | 'analytics' | 'marketing' | 'payments' | 'chat'
  | 'shop' | 'academy';

export type BlockCategory = 'platform' | 'core' | 'services' | 'commerce' | 'marketing' | 'future';

// ─── Definición de bloque ─────────────────────────────────────────────────────
export interface BlockDefinition {
  id:              BlockId;
  name:            string;
  description:     string;
  category:        BlockCategory;
  priceARS:        number;       // legacy — referencia histórica
  agencyPriceARS:  number;       // legacy — referencia histórica
  priceUC:         number;       // precio en UnitCoins (moneda interna)
  agencyPriceUC:   number;       // precio agencia en UnitCoins
  dependencies:    BlockId[];
  icon:            string;
  available:       boolean;
  comingSoon?:     boolean;  // true = aparece en marketplace con badge "En desarrollo" (no activable)
  alwaysActive?:   boolean;
  adminOrder?:     number;
  sidebarVisible?: (shared: BlockSharedData, negocio: any) => boolean;
  sidebarBadge?:   (shared: BlockSharedData, negocio: any) => string | number | undefined;
  SectionComponent?: ComponentType<BlockSectionProps>;
  AdminComponent?:   ComponentType<BlockAdminProps>;
  // Nombre del panel en el editor + componente
  editorLabel?:    string;
  EditorPanel?:    ComponentType<BlockEditorProps>;
}

// ─── tenant_blocks ────────────────────────────────────────────────────────────
export interface TenantBlock {
  id: number; negocio_id: number; block_id: BlockId;
  active: boolean; activated_at: string;
  config: Record<string, unknown>; price_override: number | null;
}

export interface BlockStatus {
  definition: BlockDefinition; isActive: boolean;
  activatedAt: string | null; config: Record<string, unknown>;
  effectivePriceARS: number;
}

export interface BlocksBillingSummary {
  blocks: BlockStatus[]; totalARS: number; isAgency: boolean;
}