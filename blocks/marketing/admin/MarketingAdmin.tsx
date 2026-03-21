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
import { Zap, Settings, X, ChevronRight, Clock, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { WORKFLOW_RECIPES, type WorkflowRow, type WorkflowRecipe } from '@/lib/workflows';
import type { BlockAdminProps } from '@/types/blocks';

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

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
          <Zap className="text-[#577a2c]" /> Automatizaciones
        </h1>
        <p className="text-zinc-500 text-sm">Activá mensajes automáticos para retener clientes.</p>
      </header>

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
