'use client';

import { useState } from 'react';
import {
  X, ArrowLeft, Layers, Globe, ChevronRight, CalendarDays,
  CheckCircle, Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import InlineAlert from '@/components/ui/InlineAlert';
import { VERTICALS, VERTICAL_BLOCK_MAP, type VerticalId } from '@/lib/onboarding';

const PRIMARY = '#577a2c';

const DEFAULT_SCHEDULE = {
  "1": { isOpen: true,  ranges: [{ start: "09:00", end: "18:00" }] },
  "2": { isOpen: true,  ranges: [{ start: "09:00", end: "18:00" }] },
  "3": { isOpen: true,  ranges: [{ start: "09:00", end: "18:00" }] },
  "4": { isOpen: true,  ranges: [{ start: "09:00", end: "18:00" }] },
  "5": { isOpen: true,  ranges: [{ start: "09:00", end: "18:00" }] },
  "6": { isOpen: false, ranges: [] },
  "0": { isOpen: false, ranges: [] },
};

const SELECTABLE_BLOCKS = [
  { id: 'calendar', name: 'Turnos & Agenda',  desc: 'Reservas online, servicios, equipo',  price: '25 UC/mes' },
  { id: 'reviews',  name: 'Valoraciones',      desc: 'Reseñas de clientes, Google Reviews', price: '7 UC/mes'  },
  { id: 'gallery',  name: 'Galería',           desc: 'Fotos de trabajos y portfolio',        price: '8 UC/mes'  },
  { id: 'crm',      name: 'Base de Clientes',  desc: 'Historial y datos de clientes',        price: '15 UC/mes' },
];

const TEMPLATES = [
  {
    id: 'confirm_booking',
    name: 'Turnos Online',
    desc: 'Landing + agenda de turnos + valoraciones. Ideal para peluquerías, clínicas, estudios.',
    blocks: ['landing', 'calendar', 'reviews'],
    color: 'from-blue-500 to-indigo-600',
  },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

interface ClientCreateModalProps {
  open: boolean;
  agencyId: number;
  onClose: () => void;
  onCreated: () => void;
}

export default function ClientCreateModal({ open, agencyId, onClose, onCreated }: ClientCreateModalProps) {
  const supabase = createClient();

  const [step, setStep] = useState<'choice' | 'vertical' | 'blocks' | 'template' | 'form'>('choice');
  const [selBlocks, setSelBlocks] = useState<string[]>(['landing']);
  const [selectedVertical, setSelectedVertical] = useState<VerticalId | null>(null);
  // Track which path (blocks or template) reached the form step, for back-button navigation
  const [formCameFrom, setFormCameFrom] = useState<'blocks' | 'template'>('blocks');
  const [newData, setNewData] = useState({ email: '', password: '', nombre: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setStep('choice');
    setSelBlocks(['landing']);
    setSelectedVertical(null);
    setNewData({ email: '', password: '', nombre: '' });
    setError('');
    onClose();
  };

  const toggleBlock = (id: string) => {
    if (id === 'landing') return;
    setSelBlocks(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  const validate = () => {
    if (!newData.nombre.trim()) return 'El nombre del negocio es obligatorio.';
    if (!EMAIL_REGEX.test(newData.email)) return 'El email no es válido.';
    if (newData.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    return null;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setCreating(true);
    setError('');

    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: newData.email,
      password: newData.password,
      options: { data: { role: 'cliente' } },
    });

    if (authErr) { setError('Error de autenticación: ' + authErr.message); setCreating(false); return; }

    if (authData.user) {
      const slug =
        newData.nombre.toLowerCase().trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-') +
        '-' + Math.floor(Math.random() * 1000);

      const { data: neg, error: dbErr } = await supabase.from('negocios').insert([{
        user_id: authData.user.id,
        email: newData.email,
        agency_id: agencyId,
        nombre: newData.nombre,
        slug,
        category: 'confirm_booking',
        horarios: 'Lunes a Viernes: 09:00 - 18:00',
        mensaje_bienvenida: `Bienvenidos a ${newData.nombre}`,
        color_principal: '#000000',
        estado_plan: 'activo',
        config_web: { hero: { titulo: newData.nombre, mostrar: true }, schedule: DEFAULT_SCHEDULE },
        system: 'modular',
      }]).select('id').single();

      if (dbErr) { setError('Error en base de datos: ' + dbErr.message); setCreating(false); return; }

      if (neg?.id) {
        await supabase.from('tenant_blocks').insert(
          selBlocks.map(bid => ({
            negocio_id: neg.id, block_id: bid, active: true,
            activated_at: new Date().toISOString(), config: {},
          }))
        );
      }

      onCreated();
      reset();
    }

    setCreating(false);
  };

  if (!open) return null;

  const stepTitle: Record<string, string> = {
    choice: 'Nuevo Cliente', vertical: 'Tipo de negocio', blocks: 'Elegí los bloques',
    template: 'Elegí una plantilla', form: 'Datos del negocio',
  };
  const stepDesc: Record<string, string> = {
    choice: '¿Cómo querés empezar?',
    vertical: 'Seleccioná el rubro',
    blocks: `${selBlocks.length} bloques · landing siempre incluido`,
    template: 'Plantillas predefinidas',
    form: 'Completá los datos',
  };

  // Resolve where the back button should navigate depending on current step
  const handleBack = () => {
    if (step === 'vertical') setStep('choice');
    else if (step === 'blocks') setStep('vertical');
    else if (step === 'template') setStep('choice');
    else if (step === 'form') setStep(formCameFrom);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {step !== 'choice' && (
              <button onClick={handleBack} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                <ArrowLeft size={16} />
              </button>
            )}
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{stepTitle[step]}</h3>
              <p className="text-xs text-slate-400">{stepDesc[step]}</p>
            </div>
          </div>
          <button onClick={reset} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {/* STEP: choice */}
          {step === 'choice' && (
            <div className="space-y-3">
              {[
                { key: 'scratch', icon: <Layers size={22} />, title: 'Crear desde cero', desc: 'Elegís los bloques que querés activar' },
                { key: 'template', icon: <Globe size={22} />, title: 'Usar una plantilla', desc: 'Bloques listos y preconfigurados' },
              ].map(opt => (
                <button key={opt.key}
                  onClick={() => {
                    if (opt.key === 'scratch') {
                      setSelBlocks(['landing']);
                      setStep('vertical');
                    } else {
                      setStep('template');
                    }
                  }}
                  className="w-full p-5 border-2 border-slate-200 rounded-xl hover:border-[#577a2c] hover:bg-[#577a2c]/5 transition-all group text-left flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 group-hover:bg-[#577a2c]/10 rounded-xl flex items-center justify-center shrink-0 text-slate-500 group-hover:text-[#577a2c] transition-colors">
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{opt.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-[#577a2c]" />
                </button>
              ))}
            </div>
          )}

          {/* STEP: vertical */}
          {step === 'vertical' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 mb-3">Elegí el rubro para preseleccionar los bloques recomendados.</p>
              <div className="grid grid-cols-2 gap-2">
                {VERTICALS.map(v => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVertical(v.id);
                      setSelBlocks(['landing', ...VERTICAL_BLOCK_MAP[v.id].filter(b => b !== 'landing')]);
                      setStep('blocks');
                    }}
                    className="flex items-center gap-2 p-3 border-2 border-slate-200 rounded-xl hover:border-[#577a2c] hover:bg-[#577a2c]/5 transition-all text-left group"
                  >
                    <span className="text-xl">{v.icon}</span>
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-[#577a2c]">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP: blocks */}
          {step === 'blocks' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-[#577a2c]/5 border border-[#577a2c]/20 rounded-xl">
                <Globe size={16} className="text-[#577a2c]" />
                <div className="flex-1">
                  <p className="font-bold text-sm">Landing Page</p>
                  <p className="text-xs text-zinc-500">Gratis · Siempre activo</p>
                </div>
                <CheckCircle size={16} className="text-[#577a2c]" />
              </div>
              {SELECTABLE_BLOCKS.map(b => {
                const sel = selBlocks.includes(b.id);
                return (
                  <button key={b.id} onClick={() => toggleBlock(b.id)}
                    className={`w-full flex items-center gap-3 p-3 border-2 rounded-xl transition-all text-left ${sel ? 'border-[#577a2c] bg-[#577a2c]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm">{b.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{b.desc} · {b.price}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${sel ? 'border-[#577a2c] bg-[#577a2c]' : 'border-slate-300'}`}>
                      {sel && <CheckCircle size={10} className="text-white" />}
                    </div>
                  </button>
                );
              })}
              <button onClick={() => { setFormCameFrom('blocks'); setStep('form'); }}
                className="w-full mt-2 py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                style={{ backgroundColor: PRIMARY }}>
                Continuar <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* STEP: template */}
          {step === 'template' && (
            <div className="space-y-3">
              {TEMPLATES.map(t => (
                <button key={t.id} onClick={() => { setSelBlocks(t.blocks); setFormCameFrom('template'); setStep('form'); }}
                  className="w-full p-5 border-2 border-slate-200 rounded-xl hover:border-[#577a2c] hover:bg-[#577a2c]/5 transition-all text-left flex items-start gap-4 group">
                  <div className={`w-14 h-14 bg-gradient-to-br ${t.color} rounded-xl flex items-center justify-center text-white shrink-0 shadow-md`}>
                    <CalendarDays size={26} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 group-hover:text-[#577a2c]">{t.name}</p>
                    <p className="text-sm text-slate-500 mt-1">{t.desc}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.blocks.map(b => (
                        <span key={b} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{b}</span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-[#577a2c] mt-1" />
                </button>
              ))}
            </div>
          )}

          {/* STEP: form */}
          {step === 'form' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex flex-wrap gap-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase w-full mb-1">Bloques a activar:</span>
                {selBlocks.map(b => (
                  <span key={b} className="text-[11px] font-bold bg-[#577a2c]/10 text-[#577a2c] px-2 py-0.5 rounded-full capitalize">{b}</span>
                ))}
              </div>

              <Field label="Nombre del Negocio">
                <input required type="text" placeholder="Ej: Barbería Vintage"
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#577a2c] outline-none text-zinc-900"
                  onChange={e => setNewData({ ...newData, nombre: e.target.value })} />
              </Field>
              <Field label="Email (Login)">
                <input required type="email" placeholder="cliente@gmail.com"
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#577a2c] outline-none text-zinc-900"
                  onChange={e => setNewData({ ...newData, email: e.target.value })} />
              </Field>
              <Field label="Contraseña">
                <input required type="password" placeholder="Mínimo 8 caracteres" minLength={8}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[#577a2c] outline-none text-zinc-900"
                  onChange={e => setNewData({ ...newData, password: e.target.value })} />
              </Field>

              <p className="text-xs text-slate-400">Dirección, WhatsApp, horarios y foto se configuran desde el editor del negocio.</p>

              {error && <InlineAlert type="error" message={error} onDismiss={() => setError('')} />}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={reset} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl">
                  Cancelar
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-3 font-bold rounded-xl flex justify-center items-center gap-2 text-white disabled:opacity-60"
                  style={{ backgroundColor: PRIMARY }}>
                  {creating ? <><Loader2 className="animate-spin" size={16} /> Creando...</> : 'Crear Cliente'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
