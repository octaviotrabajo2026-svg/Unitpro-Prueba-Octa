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
  calendar:      { name: 'Turnos & Calendario',priceARS: 2500, agencyPriceARS: 1750, priceUC: 25, agencyPriceUC: 18 },
  crm:           { name: 'Clientes',           priceARS: 1500, agencyPriceARS: 1050, priceUC: 15, agencyPriceUC: 11 },
  reviews:       { name: 'Valoraciones',       priceARS: 700,  agencyPriceARS: 490,  priceUC: 7,  agencyPriceUC: 5  },
  gallery:       { name: 'Galería',            priceARS: 800,  agencyPriceARS: 560,  priceUC: 8,  agencyPriceUC: 6  },
  analytics:     { name: 'Analytics',          priceARS: 1500, agencyPriceARS: 1050, priceUC: 15, agencyPriceUC: 11 },
  marketing:     { name: 'Marketing',          priceARS: 1000, agencyPriceARS: 700,  priceUC: 10, agencyPriceUC: 7  },
  payments:      { name: 'Pagos',              priceARS: 2000, agencyPriceARS: 1400, priceUC: 20, agencyPriceUC: 14 },
  chat:          { name: 'Chat',               priceARS: 1000, agencyPriceARS: 700,  priceUC: 10, agencyPriceUC: 7  },
  shop:          { name: 'Tienda Online',      priceARS: 4000, agencyPriceARS: 2800, priceUC: 40, agencyPriceUC: 28 },
  academy:       { name: 'Academia',           priceARS: 3500, agencyPriceARS: 2450, priceUC: 35, agencyPriceUC: 25 },
};