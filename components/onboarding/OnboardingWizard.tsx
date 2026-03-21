'use client';
// components/onboarding/OnboardingWizard.tsx
// Main orchestrator for the 3-step onboarding flow.

import { useState } from 'react';
import { Check } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { activateBlocksBatch } from '@/lib/blocks';
import { VERTICAL_BLOCK_MAP } from '@/lib/onboarding';
import type { VerticalId } from '@/lib/onboarding';
import type { BlockId } from '@/types/blocks';
import VerticalSelector from '@/components/onboarding/VerticalSelector';
import HeroPreview      from '@/components/onboarding/HeroPreview';
import BlockSuggestions from '@/components/onboarding/BlockSuggestions';

interface HeroData {
  titulo: string;
  subtitulo: string;
  cta: string;
}

interface Props {
  negocio: { id: number; nombre: string; config_web?: Record<string, any> };
  onComplete: () => void;
}

type Step = 1 | 2 | 3;

const STEP_LABELS = ['Tu negocio', 'Página web', 'Funcionalidades'];

export default function OnboardingWizard({ negocio, onComplete }: Props) {
  const [step, setStep]           = useState<Step>(1);
  const [vertical, setVertical]   = useState<VerticalId | null>(null);
  const [customText, setCustomText] = useState('');
  const [heroData, setHeroData]   = useState<HeroData | null>(null);
  const [saving, setSaving]       = useState(false);

  /** Marks onboarding as done in localStorage and calls onComplete. */
  function markDone() {
    localStorage.setItem(`unitpro_onboarding_done_${negocio.id}`, 'true');
    onComplete();
  }

  /** Handles final step: activate blocks, save hero data, complete. */
  async function handleFinish(selectedBlocks: BlockId[]) {
    setSaving(true);

    // 1. Activate selected blocks in tenant_blocks.
    await activateBlocksBatch(negocio.id, selectedBlocks);

    // 2. Persist hero data and onboarding metadata if hero was generated.
    if (heroData || vertical) {
      const supabase = createClient();
      const existingConfig = negocio.config_web ?? {};
      await supabase
        .from('negocios')
        .update({
          config_web: {
            ...existingConfig,
            ...(heroData ? { hero: heroData } : {}),
            onboarding: {
              vertical,
              customText: vertical === 'otro' ? customText : undefined,
              completedAt: new Date().toISOString(),
            },
          },
        })
        .eq('id', negocio.id);
    }

    setSaving(false);
    markDone();
  }

  const suggestedBlocks: BlockId[] = vertical ? VERTICAL_BLOCK_MAP[vertical] : ['landing', 'about'];

  // Vertical label used for the hero generation prompt.
  const verticalLabel =
    vertical === 'otro' && customText
      ? customText
      : VERTICAL_BLOCK_MAP[vertical ?? 'otro']
      ? vertical ?? 'negocio'
      : 'negocio';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10" style={{ backgroundColor: '#ede9dd' }}>

      {/* Card */}
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg overflow-hidden">

        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-zinc-100">
          <h1 className="text-xl font-bold text-zinc-800">Bienvenido a UnitPro</h1>
          <p className="text-sm text-zinc-500 mt-1">Configuremos tu negocio en 3 pasos.</p>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-5">
            {STEP_LABELS.map((label, i) => {
              const num     = (i + 1) as Step;
              const isDone  = step > num;
              const isActive = step === num;
              return (
                <div key={num} className="flex items-center gap-2 flex-1">
                  <div
                    className={[
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
                      isDone  ? 'bg-[#577a2c] text-white' : '',
                      isActive ? 'bg-[#577a2c] text-white' : '',
                      !isDone && !isActive ? 'bg-zinc-200 text-zinc-400' : '',
                    ].join(' ')}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {isDone ? <Check size={14} /> : num}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-zinc-800' : 'text-zinc-400'}`}>
                    {label}
                  </span>
                  {i < STEP_LABELS.length - 1 && (
                    <div className={`flex-1 h-px mx-1 ${isDone ? 'bg-[#577a2c]' : 'bg-zinc-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="px-8 py-6">

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-zinc-800">¿Qué tipo de negocio tenés?</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  Usamos esto para sugerirte las funcionalidades más útiles para vos.
                </p>
              </div>

              <VerticalSelector
                selected={vertical}
                customText={customText}
                onSelect={setVertical}
                onCustomTextChange={setCustomText}
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={markDone}
                  className="text-sm text-zinc-400 hover:text-zinc-600 underline transition-colors"
                >
                  Omitir configuración
                </button>
                <button
                  type="button"
                  disabled={!vertical}
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#577a2c' }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <HeroPreview
              negocioId={negocio.id}
              businessName={negocio.nombre}
              verticalLabel={verticalLabel}
              onAccept={data => {
                setHeroData(data);
                setStep(3);
              }}
              onSkip={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            saving ? (
              <div className="flex flex-col items-center gap-3 py-10 text-zinc-400">
                <div className="w-8 h-8 border-4 border-zinc-200 border-t-[#577a2c] rounded-full animate-spin" />
                <p className="text-sm">Guardando configuración...</p>
              </div>
            ) : (
              <BlockSuggestions
                suggestedBlocks={suggestedBlocks}
                onFinish={handleFinish}
                onBack={() => setStep(2)}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
