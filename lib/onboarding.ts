// lib/onboarding.ts
import type { BlockId } from '@/types/blocks';

export const VERTICAL_IDS = [
  'peluqueria', 'clinica', 'gimnasio', 'restaurant', 'spa',
  'constructora', 'coach', 'comercio', 'otro'
] as const;
export type VerticalId = typeof VERTICAL_IDS[number];

export const VERTICALS: { id: VerticalId; label: string; icon: string }[] = [
  { id: 'peluqueria',   label: 'Peluquería / Barbería',       icon: '✂️'  },
  { id: 'clinica',      label: 'Clínica / Consultorio',       icon: '🏥'  },
  { id: 'gimnasio',     label: 'Gimnasio / Pilates',          icon: '💪'  },
  { id: 'restaurant',   label: 'Restaurant / Café',           icon: '🍽️' },
  { id: 'spa',          label: 'Spa / Estética',              icon: '✨'  },
  { id: 'constructora', label: 'Constructora / Inmobiliaria', icon: '🏗️' },
  { id: 'coach',        label: 'Coach / Consultor',           icon: '🎯'  },
  { id: 'comercio',     label: 'Comercio / Tienda',           icon: '🛍️' },
  { id: 'otro',         label: 'Otro',                        icon: '🏢'  },
];

export const VERTICAL_BLOCK_MAP: Record<VerticalId, BlockId[]> = {
  peluqueria:   ['landing', 'calendar', 'reviews', 'gallery', 'marketing'],
  clinica:      ['landing', 'calendar', 'crm', 'reviews', 'about'],
  gimnasio:     ['landing', 'calendar', 'marketing', 'reviews', 'about'],
  restaurant:   ['landing', 'gallery', 'marketing', 'reviews', 'crm'],
  spa:          ['landing', 'calendar', 'marketing', 'gallery', 'reviews'],
  constructora: ['landing', 'about', 'gallery', 'crm', 'reviews'],
  coach:        ['landing', 'about', 'calendar', 'crm', 'reviews', 'academy'],
  comercio:     ['landing', 'shop', 'crm', 'reviews', 'gallery'],
  otro:         ['landing', 'about'],
};
