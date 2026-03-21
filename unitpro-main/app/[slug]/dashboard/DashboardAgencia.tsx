'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import {
  ShieldCheck, Plus, LogOut, Users, Loader2, Palette,
  ExternalLink, MapPin, Clock, Trash2, Puzzle, Globe,
  Pencil, Settings, Play, Pause,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import WebEditor from './WebEditor';
import BlockMarketplace from '@/components/dashboards/BlockMarketplace';
import LandingAgenciaEditor from './LandingAgenciaEditor';
import { toggleClientPlanStatus, deleteClientComplete } from '@/app/actions/admin/agency-actions';
import { AgencyClient, AgencyProfile } from '@/types/agency';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import InlineAlert from '@/components/ui/InlineAlert';
import ClientCreateModal from './components/ClientCreateModal';
import ClientEditModal from './components/ClientEditModal';
import AgencySettingsModal from './components/AgencySettingsModal';
import SectionOrderManager from '@/components/dashboards/SectionOrderManager';

const PRIMARY = '#577a2c';

export default function DashboardAgencia() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();

  const [agency, setAgency] = useState<AgencyProfile | null>(null);
  const [clientes, setClientes] = useState<AgencyClient[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado de acciones en progreso
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [suspendingId, setSuspendingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<AgencyClient | null>(null);
  const [qeClient, setQeClient] = useState<AgencyClient | null>(null);
  const [blocksPanelNegocio, setBlocksPanelNegocio] = useState<{ id: number; nombre: string } | null>(null);
  const [showAgencyCfg, setShowAgencyCfg] = useState(false);
  const [showLandingEditor, setShowLandingEditor] = useState(false);
  const [blocksTab, setBlocksTab] = useState<'orden' | 'tienda'>('orden');
  const [blockPerms, setBlockPerms] = useState<Record<string, boolean>>({});
  const [loadingPerms, setLoadingPerms] = useState(false);

  // ConfirmDialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: 'danger' | 'warning' | 'default';
    action: (() => void) | null;
  }>({ open: false, title: '', description: '', variant: 'default', action: null });

  useEffect(() => { checkSession(); }, []);

  async function checkSession() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { router.push('/login'); return; }
    const { data: ag, error } = await supabase.from('agencies').select('*').eq('slug', params.slug).single();
    if (error || !ag || ag.email !== user.email) { router.push('/login'); return; }
    setAgency(ag);
    cargarClientes(ag.id);
  }

  async function cargarClientes(agencyId: number) {
    const { data } = await supabase.from('negocios').select('*')
      .eq('agency_id', agencyId)
      .neq('is_agency_site', true)
      .order('created_at', { ascending: false });
    if (data) setClientes(data);
    setLoading(false);
  }

  const confirm = (title: string, description: string, variant: 'danger' | 'warning', action: () => void) => {
    setConfirmDialog({ open: true, title, description, variant, action });
  };

  const handleDelete = (id: number, nombre: string) => {
    confirm(
      `¿Eliminar "${nombre}"?`,
      'Se borrarán PERMANENTEMENTE sus turnos, reseñas, bloques y configuración. No se puede deshacer.',
      'danger',
      async () => {
        setConfirmDialog(d => ({ ...d, open: false }));
        setDeletingId(id);
        try {
          const res = await deleteClientComplete(id);
          if (!res.success) throw new Error(res.error);
          setClientes(prev => prev.filter(c => c.id !== id));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setActionError('Error al eliminar: ' + msg);
        }
        setDeletingId(null);
      }
    );
  };

  const handleToggleStatus = (id: number, currentStatus: string, nombre: string) => {
    const isActive = currentStatus === 'activo';
    confirm(
      `¿${isActive ? 'Suspender' : 'Reactivar'} a "${nombre}"?`,
      isActive
        ? 'El cliente perderá acceso a su dashboard. Podés reactivarlo cuando quieras.'
        : 'El cliente recuperará el acceso a su dashboard.',
      'warning',
      async () => {
        setConfirmDialog(d => ({ ...d, open: false }));
        setSuspendingId(id);
        const res = await toggleClientPlanStatus(id, currentStatus);
        if (res.success) {
          setClientes(prev => prev.map(c => c.id === id ? { ...c, estado_plan: res.newStatus as 'activo' | 'suspendido' } : c));
        } else {
          setActionError('Error al cambiar el estado: ' + res.error);
        }
        setSuspendingId(null);
      }
    );
  };

  const toggleEditorAccess = async (id: number, current: boolean) => {
    const { error } = await supabase.from('negocios').update({ editor_enabled: !current }).eq('id', id);
    if (!error) setClientes(prev => prev.map(c => c.id === id ? { ...c, editor_enabled: !current } : c));
  };

  const loadBlockPerms = async (negocioId: number) => {
    setLoadingPerms(true);
    const { data } = await supabase.from('negocios').select('block_edit_permissions').eq('id', negocioId).single();
    setBlockPerms((data?.block_edit_permissions as Record<string, boolean>) || {});
    setLoadingPerms(false);
  };

  const toggleBlockPerm = async (negocioId: number, blockId: string, newValue: boolean) => {
    const updated = { ...blockPerms, [blockId]: newValue };
    setBlockPerms(updated);
    await supabase.from('negocios').update({ block_edit_permissions: updated }).eq('id', negocioId);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  if (loading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[#577a2c]" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#ede9dd] text-slate-900 font-sans">

      {/* HEADER */}
      <header className="bg-[#ede9dd]/50 backdrop-blur-md border-b border-slate-200 px-6 lg:px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          {agency?.logo_url
            ? <img src={agency.logo_url} alt="logo" className="w-10 h-10 rounded-lg object-cover shadow-md" />
            : <div className="bg-[#577a2c] text-white p-2 rounded-lg shadow-md"><ShieldCheck size={24} /></div>
          }
          <div>
            <h1 className="text-xl font-bold">{agency?.name || agency?.nombre_agencia}</h1>
            <p className="text-xs text-slate-500">Panel de Control</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLandingEditor(true)}
            className="flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-xl border border-[#577a2c]/30 text-[#577a2c] hover:bg-[#577a2c]/10 transition-colors">
            <Globe size={15} /><span className="hidden sm:inline">Mi Landing</span>
          </button>
          <button onClick={() => setShowAgencyCfg(true)}
            className="flex items-center gap-2 text-sm font-bold px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white transition-colors">
            <Settings size={15} /><span className="hidden sm:inline">Configuración</span>
          </button>
          <button onClick={handleLogout}
            className="text-sm text-slate-500 hover:text-red-600 flex items-center gap-2 font-medium px-3 py-2 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={16} /><span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2"><Users className="text-slate-400" /> Tus Clientes</h2>
            <p className="text-slate-500 text-sm mt-1">Gestiona las webs y bloques de tus negocios.</p>
          </div>
          <button onClick={() => setShowCreateModal(true)}
            className="text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg hover:-translate-y-0.5"
            style={{ backgroundColor: PRIMARY }}>
            <Plus size={20} /> Nuevo Cliente
          </button>
        </div>

        {actionError && (
          <InlineAlert type="error" message={actionError} onDismiss={() => setActionError('')} className="mb-4" />
        )}

        {/* GRID DE CLIENTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clientes.map(cliente => (
            <div key={cliente.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#b0c97d] transition-all p-6 flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0"
                    style={{ backgroundColor: cliente.color_principal || '#000' }}>
                    {cliente.nombre.substring(0, 1)}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase font-bold border ${
                      cliente.estado_plan === 'activo'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}>
                      {cliente.estado_plan}
                    </span>
                    <button onClick={() => handleToggleStatus(cliente.id, cliente.estado_plan, cliente.nombre)}
                      disabled={suspendingId === cliente.id}
                      title={cliente.estado_plan === 'activo' ? 'Suspender cliente' : 'Reactivar cliente'}
                      className={`p-1.5 rounded-lg transition-all ${cliente.estado_plan === 'activo' ? 'text-amber-500 hover:bg-amber-50 hover:text-amber-600' : 'text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600'}`}>
                      {suspendingId === cliente.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : cliente.estado_plan === 'activo' ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button onClick={() => setQeClient(cliente)} title="Editar datos"
                      className="p-1.5 text-slate-300 hover:text-[#577a2c] hover:bg-[#577a2c]/10 rounded-lg transition-all">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(cliente.id, cliente.nombre)} disabled={deletingId === cliente.id}
                      title="Eliminar"
                      className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                      {deletingId === cliente.id
                        ? <Loader2 size={14} className="animate-spin text-red-500" />
                        : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-[#71a22e] transition-colors">{cliente.nombre}</h3>
                <p className="text-sm text-slate-400 mb-3 truncate font-mono bg-slate-50 inline-block px-2 py-0.5 rounded">{cliente.email}</p>

                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100 mb-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Acceso al Editor</span>
                  <button onClick={() => toggleEditorAccess(cliente.id, !!cliente.editor_enabled)}
                    className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${cliente.editor_enabled ? 'bg-[#577a2c]' : 'bg-slate-300'}`}>
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${cliente.editor_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="text-xs text-slate-500 space-y-1 border-t border-slate-100 pt-2">
                  {(cliente as any).horarios  && <p className="flex items-center gap-1"><Clock size={12} /> {(cliente as any).horarios}</p>}
                  {cliente.direccion && <p className="flex items-center gap-1"><MapPin size={12} /> {cliente.direccion}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
                <button onClick={() => setEditingClient(cliente)}
                  className="py-2.5 bg-[#577a2c]/10 hover:bg-[#577a2c]/20 rounded-xl text-xs font-bold text-[#577a2c] flex items-center justify-center gap-1 border border-[#577a2c]/20 transition-colors">
                  <Palette size={13} /> Diseñar
                </button>
                <button onClick={() => setBlocksPanelNegocio({ id: cliente.id, nombre: cliente.nombre })}
                  className="py-2.5 bg-[#8dbb38]/10 hover:bg-[#8dbb38]/20 rounded-xl text-xs font-bold text-[#577a2c] flex items-center justify-center gap-1 border border-[#8dbb38]/40 transition-colors">
                  <Puzzle size={13} /> Bloques
                </button>
                <a href={(cliente as any).custom_domain ? `https://${(cliente as any).custom_domain}` : `/${cliente.slug}`} target="_blank"
                  className="py-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1 border border-slate-200 transition-colors">
                  <ExternalLink size={13} /> Ver Web
                </a>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL BLOQUES */}
      {blocksPanelNegocio && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="font-bold">Bloques de {blocksPanelNegocio.nombre}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Activá las funciones que necesita este negocio.</p>
              </div>
              <button onClick={() => { setBlocksPanelNegocio(null); setBlocksTab('orden'); }} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg text-lg leading-none">
                ✕
              </button>
            </div>
            <div className="p-6">
              {/* Tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setBlocksTab('orden')}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${blocksTab === 'orden' ? 'bg-[#577a2c] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Orden de Secciones
                </button>
                <button
                  onClick={() => { setBlocksTab('tienda'); loadBlockPerms(blocksPanelNegocio.id); }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-colors ${blocksTab === 'tienda' ? 'bg-[#577a2c] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  Tienda de Bloques
                </button>
              </div>

              {blocksTab === 'orden' && (
                <SectionOrderManager negocioId={blocksPanelNegocio.id} />
              )}

              {blocksTab === 'tienda' && (
                <div className="space-y-6">
                  <BlockMarketplace negocioId={blocksPanelNegocio.id} isAgency={true} />

                  <div className="border-t border-slate-200 pt-6">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">Permisos de edición del negocio</h4>
                    <p className="text-xs text-slate-500 mb-4">¿Qué puede editar este negocio en su dashboard?</p>

                    {loadingPerms ? (
                      <div className="flex justify-center py-4"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
                    ) : (
                      <div className="space-y-2">
                        {[
                          { id: 'calendar', label: 'Calendario', icon: '📅' },
                          { id: 'shop', label: 'Tienda', icon: '🛍️' },
                          { id: 'academy', label: 'Academia', icon: '🎓' },
                          { id: 'gallery', label: 'Galería', icon: '🖼️' },
                          { id: 'crm', label: 'CRM / Pipeline', icon: '📊' },
                          { id: 'about', label: 'Nosotros', icon: '👥' },
                        ].map(({ id, label, icon }) => (
                          <div key={id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <span className="text-sm font-medium text-slate-700">{icon} {label}</span>
                            <button
                              onClick={() => toggleBlockPerm(blocksPanelNegocio.id, id, !(blockPerms[id] !== false))}
                              className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${blockPerms[id] !== false ? 'bg-[#577a2c]' : 'bg-slate-300'}`}
                            >
                              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${blockPerms[id] !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBCOMPONENTES */}
      <ClientCreateModal
        open={showCreateModal}
        agencyId={agency?.id || 0}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => agency && cargarClientes(agency.id)}
      />

      <ClientEditModal
        client={qeClient}
        onClose={() => setQeClient(null)}
        onSaved={(updated) => {
          setClientes(prev => prev.map(c => c.id === qeClient?.id ? { ...c, ...updated } : c));
        }}
      />

      {agency && (
        <AgencySettingsModal
          open={showAgencyCfg}
          agency={agency}
          onClose={() => setShowAgencyCfg(false)}
          onSaved={(updated) => setAgency(prev => prev ? { ...prev, ...updated } : prev)}
        />
      )}

      {editingClient && (
        <WebEditor
          initialData={editingClient}
          model="negocio"
          onClose={() => setEditingClient(null)}
          onSave={() => { setEditingClient(null); agency && cargarClientes(agency.id); }}
        />
      )}

      {showLandingEditor && agency && (
        <LandingAgenciaEditor
          agency={agency}
          onClose={() => setShowLandingEditor(false)}
          onSaved={() => {}}
        />
      )}

      {/* CONFIRM DIALOG - reemplaza window.confirm() */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.variant === 'danger' ? 'Eliminar' : 'Confirmar'}
        onConfirm={() => confirmDialog.action?.()}
        onCancel={() => setConfirmDialog(d => ({ ...d, open: false }))}
      />
    </div>
  );
}
