// blocks/_registry-data.ts
// Solo datos del registry — sin imports de componentes. Libre de circulares.
import type { BlockId } from '@/types/blocks';

export const BLOCK_PRICES: Record<BlockId, { priceARS: number; agencyPriceARS: number; priceUC: number; agencyPriceUC: number; name: string }> = {
  resumen:       { name: 'General',            priceARS: 0,    agencyPriceARS: 0,    priceUC: 0,  agencyPriceUC: 0  },
  solicitudes:   { name: 'Solicitudes',        priceARS: 0,    agencyPriceARS: 0,    priceUC: 0,  agencyPriceUC: 0  },
  suscripcion:   { name: 'Suscripción',        priceARS: 0,    agencyPriceARS: 0,    priceUC: 0,  agencyPriceUC: 0  },
  bloques:       { name: 'Mis Bloques',        priceARS: 0,    agencyPriceARS: 0,    priceUC: 0,  agencyPriceUC: 0  },
  configuracion: { name: 'Configuración',      priceARS: 0,    agencyPriceARS: 0,    priceUC: 0,  agencyPriceUC: 0  },
  landing:       { name: 'Landing Page',       priceARS: 0,    agencyPriceARS: 0,    priceUC: 0,  agencyPriceUC: 0  },
  about:         { name: 'Quiénes Somos',      priceARS: 0,    agencyPriceARS: 0,    priceUC: 0,  agencyPriceUC: 0  },
  calendar:      { name: 'Turnos & Calendario',priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0 },
  equipo:        { name: 'Equipo', priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0 },
  crm:           { name: 'Clientes',           priceARS: 0,    agencyPriceARS: 0,    priceUC: 0,  agencyPriceUC: 0  },
  reviews:       { name: 'Valoraciones',       priceARS: 0,    agencyPriceARS: 0,    priceUC: 0,  agencyPriceUC: 0  },
  gallery:       { name: 'Galería',            priceARS: 0,  agencyPriceARS: 0,  priceUC: 0,  agencyPriceUC: 0  },
  analytics:     { name: 'Analytics',          priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0 },
  marketing:     { name: 'Marketing',          priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0 },
  payments:      { name: 'Pagos',              priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0 },
  chat:          { name: 'Chat',               priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0 },
  shop:          { name: 'Tienda Online',      priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0 },
  academy:       { name: 'Academia',           priceARS: 0, agencyPriceARS: 0, priceUC: 0, agencyPriceUC: 0 },
};