'use client';
// components/onboarding/BlockSuggestions.tsx
// Step 3 of the onboarding wizard: review and confirm block suggestions.

import { useState } from 'react';
import { BLOCKS_REGISTRY, getBlockPriceUC } from '@/blocks/_registry';
import type { BlockId } from '@/types/blocks';

interface Props {
  suggestedBlocks: BlockId[];
  onFinish: (selected: BlockId[]) => void;
  onBack: () => void;
}

export default function BlockSuggestions({ suggestedBlocks, onFinish, onBack }: Props) {
  // landing is always selected and cannot be toggled.
  const [selected, setSelected] = useState<Set<BlockId>>(new Set(suggestedBlocks));

  function toggle(id: BlockId) {
    if (id === 'landing') return; // always active
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /**
   * Calculates total monthly UC cost for the currently selected blocks.
   * Platform blocks (priceUC = 0) do not add to the total.
   */
  const totalUC = Array.from(selected).reduce((sum, id) => sum + getBlockPriceUC(id), 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-zinc-800">Bloques sugeridos</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Activamos estos bloques según tu tipo de negocio. Podés desactivar los que no necesites.
        </p>
      </div>

      <div className="space-y-2">
        {suggestedBlocks.map(id => {
          const def = BLOCKS_REGISTRY[id];
          if (!def) return null;

          const isChecked  = selected.has(id);
          const isLanding  = id === 'landing';
          const priceLabel = def.priceUC > 0 ? `${def.priceUC} UC/mes` : 'Gratis';

          return (
            <label
              key={id}
              className={[
                'flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all',
                isChecked
                  ? 'border-[#577a2c] bg-[#577a2c]/5'
                  : 'border-zinc-200 bg-white hover:border-zinc-300',
                isLanding ? 'cursor-default' : '',
              ].join(' ')}
            >
              <input
                type="checkbox"
                checked={isChecked}
                disabled={isLanding}
                onChange={() => toggle(id)}
                className="mt-0.5 accent-[#577a2c] w-4 h-4 shrink-0"
                aria-label={def.name}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-zinc-800">
                  {def.name}
                  {isLanding && (
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[#577a2c] bg-[#577a2c]/10 px-1.5 py-0.5 rounded">
                      Siempre activo
                    </span>
                  )}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">{def.description}</p>
              </div>
              <span className="text-xs font-bold text-zinc-400 shrink-0">{priceLabel}</span>
            </label>
          );
        })}
      </div>

      {/* Monthly cost summary */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-100 text-sm">
        <span className="text-zinc-600 font-medium">Costo mensual estimado</span>
        <span className="font-bold text-zinc-800">{totalUC} UC / mes</span>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          Atrás
        </button>
        <button
          type="button"
          onClick={() => onFinish(Array.from(selected))}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: '#577a2c' }}
        >
          Finalizar configuración
        </button>
      </div>
    </div>
  );
}
