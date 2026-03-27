"use client";
// blocks/marketing/admin/MarketingAdmin.tsx
// SQL to run in Supabase (execute manually):
//
// CREATE TABLE IF NOT EXISTS automation_workflows (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   negocio_id integer REFERENCES negocios(id) ON DELETE CASCADE,
//   recipe_id text NOT NULL,
//   enabled boolean DEFAULT false,
//   config jsonb DEFAULT '{}',
//   executions integer DEFAULT 0,
//   last_run timestamptz,
//   created_at timestamptz DEFAULT now()
// );

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { WORKFLOW_RECIPES, type WorkflowRow, type WorkflowRecipe } from '@/lib/workflows';
import type { BlockAdminProps } from '@/types/blocks';
import { Zap, Settings, X, ChevronRight, Clock, CheckCircle, Users, Mail, ArrowRight, Loader2, Image as ImageIcon } from 'lucide-react';
import { getCampaignAudience } from "@/app/actions/marketing/get-audience";
import { sendCampaignBatch } from "@/app/actions/marketing/send-campaign";
import { ImageUpload } from "@/components/ui/ImageUpload";

export default function MarketingAdmin({ negocio }: BlockAdminProps) {
  const [editorMode, setEditorMode] = useState<'easy' | 'pro'>('easy');
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state — Easy mode
  const [modalRecipe, setModalRecipe] = useState<WorkflowRecipe | null>(null);
  const [modalConfig, setModalConfig] = useState<Record<string, any>>({});

  // Side panel state — Pro mode
  const [panelRecipe, setPanelRecipe] = useState<WorkflowRecipe | null>(null);
  const [panelConfig, setPanelConfig] = useState<Record<string, any>>({});
  const [activeView, setActiveView] = useState<'campanas' | 'automatizaciones'>('campanas');

// ── Estado del wizard de campañas (migrado de legacy) ──
const [step, setStep] = useState(1);
const [campaignLoading, setCampaignLoading] = useState(false);
const [dateLimit, setDateLimit] = useState("");
const [audience, setAudience] = useState<any[]>([]);
const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
const [subject, setSubject] = useState("");
const [campaignMessage, setCampaignMessage] = useState("");
const [imageUrl, setImageUrl] = useState("");
const [progress, setProgress] = useState(0);
const [stats, setStats] = useState({ sent: 0, errors: 0 });

  // Read editorMode from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('unitpro_editor_mode');
    if (stored === 'easy' || stored === 'pro') {
      setEditorMode(stored);
    }
  }, []);

  // Load workflows from Supabase on mount
  useEffect(() => {
    loadWorkflows();
  }, [negocio.id]);

  /** Fetch all workflow rows for this negocio from Supabase. */
  async function loadWorkflows() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('automation_workflows')
        .select('*')
        .eq('negocio_id', negocio.id);
      if (error) throw error;
      setWorkflows(data ?? []);
    } catch (err) {
      console.error('[MarketingAdmin] Error loading workflows:', err);
    } finally {
      setLoading(false);
    }
  }

  /** Find the persisted row for a given recipe, if any. */
  function getWorkflowForRecipe(recipeId: string): WorkflowRow | undefined {
    return workflows.find((w) => w.recipe_id === recipeId);
  }

  /**
   * Toggle a workflow on/off.
   * If a row exists: flip `enabled`. If not: insert a new enabled row.
   */
  async function toggleWorkflow(recipe: WorkflowRecipe) {
    const supabase = createClient();
    const existing = getWorkflowForRecipe(recipe.id);

    try {
      if (existing) {
        const { error } = await supabase
          .from('automation_workflows')
          .update({ enabled: !existing.enabled })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('automation_workflows')
          .insert({
            negocio_id: negocio.id,
            recipe_id: recipe.id,
            enabled: true,
            config: recipe.defaultConfig,
          });
        if (error) throw error;
      }
      await loadWorkflows();
    } catch (err) {
      console.error('[MarketingAdmin] Error toggling workflow:', err);
    }
  }

  /**
   * Save config for a recipe.
   * Updates the existing row if found; inserts a new one otherwise.
   */
  async function saveConfig(recipeId: string, config: Record<string, any>) {
    const supabase = createClient();
    const existing = getWorkflowForRecipe(recipeId);

    try {
      if (existing) {
        const { error } = await supabase
          .from('automation_workflows')
          .update({ config })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const recipe = WORKFLOW_RECIPES.find((r) => r.id === recipeId);
        const { error } = await supabase
          .from('automation_workflows')
          .insert({
            negocio_id: negocio.id,
            recipe_id: recipeId,
            enabled: false,
            config,
          });
        if (error) throw error;
      }
      await loadWorkflows();
    } catch (err) {
      console.error('[MarketingAdmin] Error saving workflow config:', err);
    }
  }

  // ── Funciones del wizard de campañas ──
const handleSearchAudience = async () => {
  if (!dateLimit) return alert("Selecciona una fecha");
  setCampaignLoading(true);
  const res = await getCampaignAudience(negocio.id, dateLimit);
  if (res.success && res.data) {
    setAudience(res.data);
    setSelectedEmails(new Set(res.data.map((c: any) => c.cliente_email)));
    setStep(2);
  } else {
    alert("Error buscando clientes: " + res.error);
  }
  setCampaignLoading(false);
};

const toggleEmail = (email: string) => {
  const newSet = new Set(selectedEmails);
  if (newSet.has(email)) newSet.delete(email); else newSet.add(email);
  setSelectedEmails(newSet);
};

const toggleAll = () => {
  if (selectedEmails.size === audience.length) setSelectedEmails(new Set());
  else setSelectedEmails(new Set(audience.map(c => c.cliente_email)));
};

const startCampaign = async () => {
  if (!confirm(`¿Estás seguro de enviar este correo a ${selectedEmails.size} clientes?`)) return;
  setStep(4);
  setProgress(0);
  setStats({ sent: 0, errors: 0 });
  const finalList = audience.filter(c => selectedEmails.has(c.cliente_email));
  const BATCH_SIZE = 50;
  const total = finalList.length;
  let processed = 0;
  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = finalList.slice(i, i + BATCH_SIZE).map(c => ({
      email: c.cliente_email, nombre: c.cliente_nombre
    }));
    const res = await sendCampaignBatch(negocio.id, batch, subject, campaignMessage, imageUrl);
    if (res.success) {
      setStats(prev => ({ sent: prev.sent + (res.sentCount || 0), errors: prev.errors + (res.errors?.length || 0) }));
    } else {
      setStats(prev => ({ ...prev, errors: prev.errors + batch.length }));
    }
    processed += batch.length;
    setProgress(Math.round((processed / total) * 100));
    await new Promise(r => setTimeout(r, 500));
  }
};

const resetCampaign = () => {
  setStep(1); setDateLimit(""); setSubject(""); setCampaignMessage(""); setImageUrl("");
};

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <Zap className="text-[#577a2c]" /> Marketing
        </h1>
        <p className="text-zinc-500 text-sm">Campañas manuales y automatizaciones para retener clientes.</p>
        
        {/* Tabs */}
        <div className="flex gap-1 mt-4 bg-zinc-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveView('campanas')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeView === 'campanas' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}>
            <Mail size={14} className="inline mr-1.5 -mt-0.5" /> Campañas
          </button>
          <button
            onClick={() => setActiveView('automatizaciones')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeView === 'automatizaciones' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}>
            <Zap size={14} className="inline mr-1.5 -mt-0.5" /> Automatizaciones
          </button>
        </div>
      </header>


      {/* ── Tab: Campañas de Email (migrado de legacy) ─────────────────────── */}
      {activeView === 'campanas' && (
        <div className="animate-in fade-in slide-in-from-bottom-4">

          {/* --- PASO 1: FILTRO --- */}
          {step === 1 && (
            <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm text-center">
              <div className="w-16 h-16 bg-[#577a2c]/10 text-[#577a2c] rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} />
              </div>
              <h2 className="text-lg font-bold mb-2">Definir Audiencia</h2>
              <p className="text-zinc-500 mb-6">
                Selecciona una fecha. Buscaremos a todos los clientes cuyo último turno fue <b>antes</b> de ese día.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="text-left">
                  <label className="text-xs font-bold text-zinc-500 ml-1">Última visita antes de:</label>
                  <input
                    type="date"
                    className="block w-full mt-1 p-3 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-[#577a2c]/30"
                    value={dateLimit}
                    onChange={(e) => setDateLimit(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleSearchAudience}
                  disabled={campaignLoading || !dateLimit}
                  className="h-[50px] px-8 text-white font-bold rounded-xl mt-5 hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                  style={{ backgroundColor: '#577a2c' }}
                >
                  {campaignLoading ? <Loader2 className="animate-spin" /> : "Buscar Clientes"}
                </button>
              </div>
            </div>
          )}

          {/* --- PASO 2: SELECCIÓN --- */}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <h3 className="font-bold">Resultados ({audience.length})</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStep(1)}
                    className="text-zinc-500 text-sm font-medium hover:text-zinc-900 px-3 py-2"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={selectedEmails.size === 0}
                    className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-zinc-800 disabled:opacity-50"
                  >
                    Continuar ({selectedEmails.size}) <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-4">
                <table className="w-full text-sm text-left">
                  <thead className="text-zinc-500 font-medium border-b border-zinc-100">
                    <tr>
                      <th className="pb-3 w-10">
                        <input
                          type="checkbox"
                          checked={selectedEmails.size === audience.length && audience.length > 0}
                          onChange={toggleAll}
                          className="rounded border-zinc-300"
                        />
                      </th>
                      <th className="pb-3">Cliente</th>
                      <th className="pb-3">Email</th>
                      <th className="pb-3">Última Visita</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {audience.map((c, i) => (
                      <tr
                        key={i}
                        className={`hover:bg-zinc-50 transition-colors ${
                          !selectedEmails.has(c.cliente_email) && 'opacity-50'
                        }`}
                      >
                        <td className="py-3">
                          <input
                            type="checkbox"
                            checked={selectedEmails.has(c.cliente_email)}
                            onChange={() => toggleEmail(c.cliente_email)}
                            className="rounded border-zinc-300 text-[#577a2c] focus:ring-[#577a2c]/30"
                          />
                        </td>
                        <td className="py-3 font-medium">{c.cliente_nombre || 'Sin Nombre'}</td>
                        <td className="py-3 text-zinc-500 font-mono text-xs">{c.cliente_email}</td>
                        <td className="py-3 text-zinc-500 text-xs">
                          {new Date(c.fecha_inicio).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- PASO 3: REDACCIÓN --- */}
          {step === 3 && (
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="mb-6 flex justify-between items-center">
                <h2 className="text-lg font-bold">Redactar Mensaje</h2>
                <button
                  onClick={() => setStep(2)}
                  className="text-sm text-zinc-500 hover:text-zinc-900"
                >
                  Volver a lista
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">Asunto del Correo</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Ej: ¡Te extrañamos! Acá tenés un regalo 🎁"
                    className="w-full p-3 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-[#577a2c]/30 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-2 flex items-center gap-1">
                    <ImageIcon size={14} /> Imagen de Cabecera (Opcional)
                  </label>

                  {imageUrl ? (
                    <div className="relative w-fit group border border-zinc-200 rounded-xl overflow-hidden">
                      <img src={imageUrl} alt="Preview" className="h-40 object-cover" />
                      <button
                        onClick={() => setImageUrl('')}
                        className="absolute top-2 right-2 bg-white text-zinc-600 p-1 rounded-full shadow hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full max-w-md">
                      <ImageUpload
                        label="Subir imagen"
                        value={imageUrl}
                        onChange={setImageUrl}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1">
                    Cuerpo del Mensaje (HTML simple)
                  </label>
                  <div className="text-xs text-zinc-400 mb-2">
                    Tip: Usá <code className="bg-zinc-100 px-1 rounded">{'{{nombre}}'}</code> para que
                    se reemplace por el nombre del cliente.
                  </div>
                  <textarea
                    value={campaignMessage}
                    onChange={(e) => setCampaignMessage(e.target.value)}
                    rows={8}
                    placeholder="Hola {{nombre}}, hace mucho que no te vemos..."
                    className="w-full p-3 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-[#577a2c]/30 resize-none font-sans"
                  />
                </div>

                <div className="pt-4 border-t border-zinc-100 flex justify-end">
                  <button
                    onClick={startCampaign}
                    disabled={!subject || !campaignMessage}
                    className="text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:opacity-90 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
                    style={{ backgroundColor: '#577a2c' }}
                  >
                    Enviar a {selectedEmails.size} Clientes
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --- PASO 4: PROGRESO --- */}
          {step === 4 && (
            <div className="bg-white p-12 rounded-2xl border border-zinc-200 shadow-sm text-center">
              {progress < 100 ? (
                <>
                  <Loader2 size={48} className="animate-spin text-[#577a2c] mx-auto mb-6" />
                  <h2 className="text-2xl font-bold mb-2">Enviando Campaña...</h2>
                  <p className="text-zinc-500 mb-6">Por favor no cierres esta pestaña.</p>

                  <div className="w-full bg-zinc-100 rounded-full h-4 overflow-hidden mb-2">
                    <div
                      className="h-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%`, backgroundColor: '#577a2c' }}
                    />
                  </div>
                  <p className="text-xs font-bold text-zinc-400">{progress}% Completado</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in">
                    <CheckCircle size={32} />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">¡Campaña Finalizada!</h2>
                  <div className="flex justify-center gap-8 my-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-emerald-600">{stats.sent}</p>
                      <p className="text-xs text-zinc-400 uppercase font-bold">Enviados</p>
                    </div>
                    {stats.errors > 0 && (
                      <div className="text-center">
                        <p className="text-3xl font-bold text-red-500">{stats.errors}</p>
                        <p className="text-xs text-zinc-400 uppercase font-bold">Fallidos</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={resetCampaign}
                    className="font-bold hover:underline"
                    style={{ color: '#577a2c' }}
                  >
                    Crear nueva campaña
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      )}


      {activeView === 'automatizaciones' && (
        <>
        {loading ? (
          <div className="text-sm text-zinc-400 py-8 text-center">Cargando automatizaciones...</div>
        ) : (
          <div className="space-y-3">
            {WORKFLOW_RECIPES.map((recipe) => {
              const row = getWorkflowForRecipe(recipe.id);
              const isEnabled = row?.enabled ?? false;

              return (
                <div
                  key={recipe.id}
                  className="bg-white border border-zinc-200 rounded-xl p-4 flex items-center gap-4 shadow-sm"
                >
                  <span className="text-2xl">{recipe.icon}</span>

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                      {recipe.name}
                      {/* Pro mode: show execution badge */}
                      {editorMode === 'pro' && row && row.executions > 0 && (
                        <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
                          {row.executions} envíos
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{recipe.description}</p>
                    {editorMode === 'pro' && (recipe.id === 'reminder_24h' || recipe.id === 'post_visit_review' || recipe.id === 'inactive_client') && (
                      <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                        <span>⏱</span> Cron cada 15 min
                        {row?.last_run && (
                          <span className="ml-1">· Último: {new Date(row.last_run).toLocaleDateString('es-AR')}</span>
                        )}
                      </p>
                    )}
                  </div>

                  {/* Toggle switch */}
                  <button
                    onClick={() => toggleWorkflow(recipe)}
                    aria-label={isEnabled ? `Desactivar ${recipe.name}` : `Activar ${recipe.name}`}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isEnabled ? 'bg-[#577a2c]' : 'bg-zinc-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>

                  {/* Easy mode: settings button only when enabled */}
                  {editorMode === 'easy' && isEnabled && (
                    <button
                      onClick={() => {
                        setModalRecipe(recipe);
                        setModalConfig(row?.config ?? recipe.defaultConfig);
                      }}
                      aria-label={`Configurar ${recipe.name}`}
                      className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                      <Settings size={16} />
                    </button>
                  )}

                  {/* Pro mode: "Configurar" button always visible */}
                  {editorMode === 'pro' && (
                    <button
                      onClick={() => {
                        setPanelRecipe(recipe);
                        setPanelConfig(row?.config ?? recipe.defaultConfig);
                      }}
                      className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
                    >
                      Configurar <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        </>
      )}

      {/* ── Easy mode modal ─────────────────────────────────────────────────── */}
      {modalRecipe !== null && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                {modalRecipe.icon} {modalRecipe.name}
              </h3>
              <button
                onClick={() => setModalRecipe(null)}
                aria-label="Cerrar modal"
                className="p-1 hover:bg-zinc-100 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">
                  Mensaje
                </label>
                <textarea
                  rows={4}
                  value={modalConfig.message || ''}
                  onChange={(e) =>
                    setModalConfig((prev) => ({ ...prev, message: e.target.value }))
                  }
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-[#577a2c]/30"
                />
              </div>
              <div className="text-xs text-zinc-400">
                Variables disponibles:{' '}
                <code className="bg-zinc-100 px-1 rounded">{'{nombre}'}</code>{' '}
                <code className="bg-zinc-100 px-1 rounded">{'{fecha}'}</code>{' '}
                <code className="bg-zinc-100 px-1 rounded">{'{hora}'}</code>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setModalRecipe(null)}
                className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-900"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  saveConfig(modalRecipe.id, modalConfig);
                  setModalRecipe(null);
                }}
                className="px-4 py-2 text-sm font-bold text-white rounded-xl"
                style={{ backgroundColor: '#577a2c' }}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Pro mode side panel ──────────────────────────────────────────────── */}
      {panelRecipe !== null && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl border-l border-zinc-200 flex flex-col">
          <div className="h-14 px-4 border-b border-zinc-200 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              {panelRecipe.icon} {panelRecipe.name}
            </h3>
            <button
              onClick={() => setPanelRecipe(null)}
              aria-label="Cerrar panel"
              className="p-1.5 hover:bg-zinc-100 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Stats row — show only if there are executions */}
            {(getWorkflowForRecipe(panelRecipe.id)?.executions ?? 0) > 0 && (
              <div className="bg-zinc-50 rounded-xl p-3 flex items-center gap-3 border border-zinc-200">
                <CheckCircle size={18} className="text-[#577a2c]" />
                <div>
                  <p className="text-sm font-bold text-zinc-900">
                    {getWorkflowForRecipe(panelRecipe.id)?.executions} ejecuciones
                  </p>
                  {getWorkflowForRecipe(panelRecipe.id)?.last_run && (
                    <p className="text-xs text-zinc-500">
                      Última:{' '}
                      {new Date(
                        getWorkflowForRecipe(panelRecipe.id)!.last_run!
                      ).toLocaleDateString('es-AR')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* WhatsApp message */}
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">
                Mensaje WhatsApp
              </label>
              <textarea
                rows={3}
                value={panelConfig.message || ''}
                onChange={(e) =>
                  setPanelConfig((prev) => ({ ...prev, message: e.target.value }))
                }
                className="w-full p-3 border border-zinc-200 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-[#577a2c]/30"
              />
            </div>

            {/* Email message — Pro only field */}
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">
                Mensaje Email
              </label>
              <textarea
                rows={3}
                value={panelConfig.emailMessage || ''}
                onChange={(e) =>
                  setPanelConfig((prev) => ({ ...prev, emailMessage: e.target.value }))
                }
                className="w-full p-3 border border-zinc-200 rounded-xl text-sm resize-none outline-none focus:ring-2 focus:ring-[#577a2c]/30"
                placeholder="Opcional — si está vacío usa el mensaje WA"
              />
            </div>

            {/* Delay — only for recipes that define a delay in their defaultConfig */}
            {panelRecipe.defaultConfig.delay !== undefined && (
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase block mb-1 flex items-center gap-1">
                  <Clock size={12} /> Delay (horas)
                </label>
                <input
                  type="number"
                  value={panelConfig.delay ?? panelRecipe.defaultConfig.delay}
                  onChange={(e) =>
                    setPanelConfig((prev) => ({ ...prev, delay: Number(e.target.value) }))
                  }
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30"
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Negativo = antes del evento. Positivo = después.
                </p>
              </div>
            )}

            {/* Days without appointment — only for inactive_client recipe */}
            {panelRecipe.id === 'inactive_client' && (
              <div>
                <label className="text-xs font-bold text-zinc-400 uppercase block mb-1">
                  Días sin turno
                </label>
                <input
                  type="number"
                  value={panelConfig.diasSinTurno ?? 45}
                  onChange={(e) =>
                    setPanelConfig((prev) => ({
                      ...prev,
                      diasSinTurno: Number(e.target.value),
                    }))
                  }
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30"
                />
              </div>
            )}

            {/* Variable reference */}
            <div className="text-xs text-zinc-400 bg-zinc-50 rounded-lg p-3 border border-zinc-200">
              Variables:{' '}
              <code className="bg-white px-1 rounded border">{'{nombre}'}</code>{' '}
              <code className="bg-white px-1 rounded border">{'{fecha}'}</code>{' '}
              <code className="bg-white px-1 rounded border">{'{hora}'}</code>{' '}
              <code className="bg-white px-1 rounded border">{'{link_resena}'}</code>
            </div>
          </div>

          <div className="p-4 border-t border-zinc-100">
            <button
              onClick={() => {
                saveConfig(panelRecipe.id, panelConfig);
                setPanelRecipe(null);
              }}
              className="w-full py-3 rounded-xl font-bold text-sm text-white"
              style={{ backgroundColor: '#577a2c' }}
            >
              Guardar configuración
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
