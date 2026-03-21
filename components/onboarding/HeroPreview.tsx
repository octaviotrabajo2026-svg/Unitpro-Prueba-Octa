'use client';
// components/onboarding/HeroPreview.tsx
// Step 2 of the onboarding wizard: AI-generated hero text preview.

import { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

interface HeroData {
  titulo: string;
  subtitulo: string;
  cta: string;
}

interface Props {
  negocioId: number;
  businessName: string;
  verticalLabel: string;
  onAccept: (heroData: HeroData) => void;
  onSkip: () => void;
  onBack: () => void;
}

export default function HeroPreview({
  negocioId,
  businessName,
  verticalLabel,
  onAccept,
  onSkip,
  onBack,
}: Props) {
  const [heroData, setHeroData] = useState<HeroData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  /**
   * Calls the AI generate endpoint to produce hero text for this business.
   * Handles 402 (insufficient balance) and generic errors gracefully.
   */
  async function generate() {
    setLoading(true);
    setError(null);
    setHeroData(null);

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hero',
          params: { businessName, services: [verticalLabel] },
          negocioId,
        }),
      });

      if (res.status === 402) {
        setError('Saldo insuficiente para generar contenido con IA.');
        return;
      }

      if (!res.ok) {
        setError('No se pudo generar el texto. Podés omitir este paso.');
        return;
      }

      const json = await res.json();
      setHeroData(json);
    } catch {
      setError('Error de conexión al generar el texto.');
    } finally {
      setLoading(false);
    }
  }

  // Auto-generate on mount.
  useEffect(() => {
    generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-zinc-800">Vista previa del hero</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Generamos un texto de bienvenida con IA. Podés aceptarlo, regenerarlo u omitir este paso.
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-10 text-zinc-400">
          <Loader2 size={32} className="animate-spin" />
          <p className="text-sm">Generando texto con IA...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600 space-y-2">
          <p>{error}</p>
          <button
            type="button"
            onClick={onSkip}
            className="text-zinc-500 underline hover:text-zinc-700 text-sm"
          >
            Omitir este paso
          </button>
        </div>
      )}

      {/* Preview card */}
      {heroData && !loading && (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Título</p>
          <p className="font-bold text-zinc-800 text-lg leading-snug">{heroData.titulo}</p>

          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider pt-1">Subtítulo</p>
          <p className="text-zinc-600 text-sm leading-relaxed">{heroData.subtitulo}</p>

          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider pt-1">Botón CTA</p>
          <span className="inline-block text-white text-sm font-bold px-4 py-1.5 rounded-lg" style={{ backgroundColor: '#577a2c' }}>
            {heroData.cta}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="order-last sm:order-first flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          Atrás
        </button>

        {heroData && !loading && (
          <button
            type="button"
            onClick={generate}
            className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} /> Regenerar
          </button>
        )}

        {heroData && !loading && (
          <button
            type="button"
            onClick={() => onAccept(heroData)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#577a2c' }}
          >
            Aceptar y continuar
          </button>
        )}

        {!heroData && !loading && (
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-zinc-500 hover:bg-zinc-50 border border-zinc-200 transition-colors"
          >
            Omitir este paso
          </button>
        )}
      </div>
    </div>
  );
}
