// lib/blocks.ts
// Funciones cliente para interactuar con tenant_blocks desde Client Components.
// Para funciones server-only (getBlocksStatus, etc.) usar lib/blocks.server.ts.

import { createClient as createBrowserClient } from '@/lib/supabase';
import {
  BLOCKS_REGISTRY,
  checkDependencies,
} from '@/blocks/_registry';
import type { BlockId } from '@/types/blocks';

// Re-export types so consumers don't need to change their type imports
export type { BlockStatus, BlocksBillingSummary, TenantBlock } from '@/types/blocks';

// ─── ESCRITURA (browser client — se usa desde Client Components) ──────────────

/**
 * Activar un bloque para un negocio.
 * Verifica dependencias antes de activar.
 * Retorna error si faltan dependencias.
 */
export async function activateBlock(
  negocioId: number,
  blockId: BlockId
): Promise<{ success: boolean; error?: string; missingDeps?: BlockId[] }> {
  const supabase = createBrowserClient();

  // 1. Verificar dependencias
  const { data: activeData } = await supabase
    .from('tenant_blocks')
    .select('block_id')
    .eq('negocio_id', negocioId)
    .eq('active', true);

  const activeIds = (activeData ?? []).map((b: { block_id: string }) => b.block_id as BlockId);
  const { satisfied, missing } = checkDependencies(blockId, activeIds);

  if (!satisfied) {
    const missingNames = missing.map((id) => BLOCKS_REGISTRY[id].name).join(', ');
    return {
      success: false,
      error: `Primero tenés que activar: ${missingNames}`,
      missingDeps: missing,
    };
  }

  // 2. Upsert en tenant_blocks
  const { error } = await supabase
    .from('tenant_blocks')
    .upsert(
      {
        negocio_id: negocioId,
        block_id: blockId,
        active: true,
        activated_at: new Date().toISOString(),
      },
      { onConflict: 'negocio_id,block_id' }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Desactivar un bloque para un negocio.
 * Verifica que ningún bloque activo dependa de este antes de desactivarlo.
 */
export async function deactivateBlock(
  negocioId: number,
  blockId: BlockId
): Promise<{ success: boolean; error?: string; dependents?: BlockId[] }> {
  const supabase = createBrowserClient();

  // 1. Verificar que ningún bloque activo depende de este
  const { data: activeData } = await supabase
    .from('tenant_blocks')
    .select('block_id')
    .eq('negocio_id', negocioId)
    .eq('active', true);

  const activeIds = (activeData ?? []).map((b: { block_id: string }) => b.block_id as BlockId);

  const dependents = activeIds.filter((id) => {
    return BLOCKS_REGISTRY[id].dependencies.includes(blockId);
  });

  if (dependents.length > 0) {
    const depNames = dependents.map((id) => BLOCKS_REGISTRY[id].name).join(', ');
    return {
      success: false,
      error: `No podés desactivar este bloque porque lo requieren: ${depNames}`,
      dependents,
    };
  }

  // 2. Desactivar (no borramos, mantenemos el registro histórico)
  const { error } = await supabase
    .from('tenant_blocks')
    .update({ active: false })
    .eq('negocio_id', negocioId)
    .eq('block_id', blockId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Activar múltiples bloques en batch durante el onboarding.
 * Usa el browser client porque se llama desde un Client Component.
 * Solo activa bloques que estén disponibles en el registry.
 */
export async function activateBlocksBatch(
  negocioId: number,
  blockIds: BlockId[]
): Promise<{ success: boolean; error?: string }> {
  const supabase = createBrowserClient();

  // Filter out blocks that are not available in the registry.
  const validIds = blockIds.filter(id => BLOCKS_REGISTRY[id]?.available !== false);

  if (validIds.length === 0) return { success: true };

  const rows = validIds.map(blockId => ({
    negocio_id: negocioId,
    block_id: blockId,
    active: true,
  }));

  const { error } = await supabase
    .from('tenant_blocks')
    .upsert(rows, { onConflict: 'negocio_id,block_id' });

  if (error) {
    console.error('[blocks] activateBlocksBatch error:', error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Actualizar la configuración de un bloque específico.
 * Útil para guardar settings del bloque (ej: config del calendario).
 */
export async function updateBlockConfig(
  negocioId: number,
  blockId: BlockId,
  config: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createBrowserClient();

  const { error } = await supabase
    .from('tenant_blocks')
    .update({ config })
    .eq('negocio_id', negocioId)
    .eq('block_id', blockId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}