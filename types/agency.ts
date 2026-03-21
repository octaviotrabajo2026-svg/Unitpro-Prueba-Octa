// types/agency.ts
// Tipos para el dashboard de agencia (reemplaza `any` en DashboardAgencia.tsx)

import { WebConfig } from './web-config';

export interface AgencyClient {
  id: number;
  nombre: string;
  email: string;
  whatsapp?: string;
  direccion?: string;
  slug: string;
  estado_plan: 'activo' | 'suspendido';
  color_principal?: string;
  category?: string;
  system?: string;
  editor_enabled?: boolean;
  google_maps_link?: string;
  config_web?: WebConfig;
  logo_url?: string;
  block_edit_permissions?: Record<string, boolean>;
}

export interface AgencyProfile {
  id: number;
  name?: string;
  nombre_agencia?: string;
  email: string;
  slug: string;
  logo_url?: string;
  plan?: string;
  whitelabel_config?: {
    name?: string;
    logoUrl?: string;
    primaryColor?: string;
    domain?: string;
    favicon?: string;
  };
}

export interface NewClientData {
  nombre: string;
  email: string;
  password: string;
  whatsapp: string;
  direccion: string;
  color_principal: string;
  category: string;
  system: string;
}
