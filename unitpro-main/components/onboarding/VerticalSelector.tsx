'use client';
// components/onboarding/VerticalSelector.tsx
// Step 1 of the onboarding wizard: pick a business vertical.

import { VERTICALS } from '@/lib/onboarding';
import type { VerticalId } from '@/lib/onboarding';

interface Props {
  selected: VerticalId | null;
  customText: string;
  onSelect: (id: VerticalId) => void;
  onCustomTextChange: (text: string) => void;
}

export default function VerticalSelector({
  selected,
  customText,
  onSelect,
  onCustomTextChange,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {VERTICALS.map(({ id, label, icon }) => {
          const isSelected = selected === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={[
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all',
                isSelected
                  ? 'border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c]'
                  : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50',
              ].join(' ')}
            >
              <span className="text-2xl" role="img" aria-label={label}>
                {icon}
              </span>
              <span className="text-center leading-tight">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Custom text input when "Otro" is selected */}
      {selected === 'otro' && (
        <div className="mt-2">
          <label htmlFor="custom-vertical" className="block text-sm font-medium text-zinc-700 mb-1">
            Describí tu negocio
          </label>
          <input
            id="custom-vertical"
            type="text"
            value={customText}
            onChange={e => onCustomTextChange(e.target.value)}
            placeholder="Ej: Estudio de tatuajes, academia de idiomas..."
            className="w-full px-4 py-2.5 border border-zinc-200 rounded-xl text-sm outline-none focus:border-[#577a2c] transition-colors"
          />
        </div>
      )}
    </div>
  );
}
