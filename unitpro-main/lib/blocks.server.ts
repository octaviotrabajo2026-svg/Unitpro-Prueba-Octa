// lib/blocks.server.ts
// Funciones server-only para interactuar con tenant_blocks.
// SOLO usar desde Server Components, Server Actions o API Routes.
// No importar desde Client Components — usar lib/blocks.ts para eso.

import { createClient } from '@/lib/supabase-server';
import {
  BLOCKS_REGISTRY,
  getBlockPrice,
} from '@/blocks/_registry';
import type { BlockId, BlockStatus, TenantBlock } from '@/types/blocks';

/**
 * Obtener todos los bloques de un negocio con su estado.
 * Combina la DB con el registry para devolver un estado completo.
 */
export async function getBlocksStatus(
  negocioId: number,
  isAgency = false
): Promise<BlockStatus[]> {
  const supabase = await createClient();

  const { data: tenantBlocks } = await supabase
    .from('tenant_blocks')
    .select('*')
    .eq('negocio_id', negocioId);

  return Object.values(BLOCKS_REGISTRY).map((definition) => {
    const dbBlock = tenantBlocks?.find(
      (b: TenantBlock) => b.block_id === definition.id
    );

    const effectivePriceARS =
      dbBlock?.price_override !== null && dbBlock?.price_override !== undefined
        ? dbBlock.price_override
        : getBlockPrice(definition.id, isAgency);

    return {
      definition,
      isActive: dbBlock?.active ?? false,
      activatedAt: dbBlock?.activated_at ?? null,
      config: dbBlock?.config ?? {},
      effectivePriceARS,
    };
  });
}

/**
 * Obtener solo los IDs de los bloques activos de un negocio.
 */
export async function getActiveBlockIds(negocioId: number): Promise<BlockId[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from('tenant_blocks')
    .select('block_id')
    .eq('negocio_id', negocioId)
    .eq('active', true);

  return (data ?? []).map((b: { block_id: string }) => b.block_id as BlockId);
}

