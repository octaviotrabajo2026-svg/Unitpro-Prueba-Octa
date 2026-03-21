'use client';

import { useState } from 'react';
import {
  X, Pencil, KeyRound, Mail, Phone, MapPin,
  Lock, Eye, EyeOff, Loader2, CheckCircle, Save
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { changeClientPassword, changeClientEmail } from '@/app/actions/admin/agency-actions';
import { AgencyClient } from '@/types/agency';
import InlineAlert from '@/components/ui/InlineAlert';
import SaveButton, { SaveStatus } from '@/components/ui/SaveButton';

const PRIMARY = '#577a2c';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

interface ClientEditModalProps {
  client: AgencyClient | null;
  onClose: () => void;
  onSaved: (updated: Partial<AgencyClient>) => void;
}

export default function ClientEditModal({ client, onClose, onSaved }: ClientEditModalProps) {
  const supabase = createClient();
  const [tab, setTab] = useState<'datos' | 'pass'>('datos');

  // Datos tab
  const [data, setData] = useState({
    nombre: client?.nombre || '',
    whatsapp: client?.whatsapp || '',
    email: client?.email || '',
    direccion: client?.direccion || '',
  });
  const [dataStatus, setDataStatus] = useState<SaveStatus>('idle');
  const [dataError, setDataError] = useState('');

  // Password tab
  const [newPass, setNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [passStatus, setPassStatus] = useState<SaveStatus>('idle');
  const [passError, setPassError] = useState('');

  if (!client) return null;

  const handleSaveData = async () => {
    if (!EMAIL_REGEX.test(data.email)) { setDataError('El email no es válido.'); return; }
    setDataError('');
    setDataStatus('saving');

    const { error } = await supabase.from('negocios').update({
      nombre: data.nombre,
      whatsapp: data.whatsapp,
      direccion: data.direccion,
    }).eq('id', client.id);

    if (error) { setDataError(error.message); setDataStatus('error'); return; }

    if (data.email !== client.email) {
      const res = await changeClientEmail(client.id, data.email);
      if (!res.success) { setDataError(res.error || 'Error al cambiar email.'); setDataStatus('error'); return; }
    }

    setDataStatus('saved');
    onSaved({ nombre: data.nombre, whatsapp: data.whatsapp, direccion: data.direccion, email: data.email });
    setTimeout(() => { onClose(); }, 1200);
  };

  const handleChangePassword = async () => {
    if (newPass.length < 8) { setPassError('La contraseña debe tener al menos 8 caracteres.'); return; }
    setPassError('');
    setPassStatus('saving');
    const res = await changeClientPassword(client.id, newPass);
    if (res.success) {
      setPassStatus('saved');
      setNewPass('');
      setTimeout(() => setPassStatus('idle'), 2500);
    } else {
      setPassError(res.error || 'Error inesperado.');
      setPassStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow"
              style={{ backgroundColor: client.color_principal || PRIMARY }}>
              {client.nombre?.charAt(0) || 'N'}
            </div>
            <div>
              <h3 className="font-bold text-sm">Editar cliente</h3>
              <p className="text-xs text-slate-400">{client.slug}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
            <X size={17} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mx-6 mt-4 bg-slate-100 p-1 rounded-xl">
          {([
            { id: 'datos' as const, label: 'Datos', icon: <Pencil size={12} /> },
            { id: 'pass' as const,  label: 'Contraseña', icon: <KeyRound size={12} /> },
          ]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${tab === t.id ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Tab: Datos */}
        {tab === 'datos' && (
          <>
            <div className="p-6 space-y-4">
              <Field label="Nombre del negocio">
                <input type="text" value={data.nombre}
                  onChange={e => setData(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900" />
              </Field>
              <Field label="Email de login">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input type="email" value={data.email}
                    onChange={e => setData(p => ({ ...p, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900"
                    placeholder="nuevo@email.com" />
                </div>
                {data.email !== client.email && (
                  <p className="text-[11px] text-amber-600 mt-1">⚠️ Cambiar el email actualiza también el acceso de login.</p>
                )}
              </Field>
              <Field label="WhatsApp">
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input type="text" value={data.whatsapp}
                    onChange={e => setData(p => ({ ...p, whatsapp: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900"
                    placeholder="+549..." />
                </div>
              </Field>
              <Field label="Dirección">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input type="text" value={data.direccion}
                    onChange={e => setData(p => ({ ...p, direccion: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900"
                    placeholder="Av. Siempre Viva 123" />
                </div>
              </Field>
              {dataError && <InlineAlert type="error" message={dataError} onDismiss={() => setDataError('')} />}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-sm">
                Cancelar
              </button>
              <SaveButton
                status={dataStatus}
                onClick={handleSaveData}
                idleLabel="Guardar cambios"
                className="flex-1 py-3 justify-center"
              />
            </div>
          </>
        )}

        {/* Tab: Contraseña */}
        {tab === 'pass' && (
          <>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <Lock size={15} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Cambia la contraseña del acceso al dashboard del cliente. El cambio es inmediato.</p>
              </div>
              <Field label="Nueva contraseña">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input type={showPass ? 'text' : 'password'} value={newPass}
                    onChange={e => setNewPass(e.target.value)} minLength={8}
                    className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900"
                    placeholder="Mínimo 8 caracteres" />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </Field>
              {passError && <InlineAlert type="error" message={passError} onDismiss={() => setPassError('')} />}
              {passStatus === 'saved' && <InlineAlert type="success" message="Contraseña actualizada correctamente." />}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl text-sm">
                Cerrar
              </button>
              <SaveButton
                status={passStatus}
                onClick={handleChangePassword}
                disabled={newPass.length < 8}
                idleLabel="Cambiar contraseña"
                savedLabel="¡Listo!"
                className="flex-1 py-3 justify-center"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
