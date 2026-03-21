"use client";
// blocks/shop/editor/ShopPanel.tsx

import { useState, useEffect } from 'react';
import { Plus, Package, X, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { BlockEditorProps } from '@/types/blocks';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: string;
  stock: number | null;
  image_url: string | null;
  active: boolean;
  created_at: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const PRIMARY = '#577a2c';

const PRODUCT_TYPES = [
  { value: 'physical',     label: 'Físico' },
  { value: 'digital',      label: 'Digital' },
  { value: 'voucher',      label: 'Voucher' },
  { value: 'service_pack', label: 'Pack de servicios' },
];

const typeBadgeClass: Record<string, string> = {
  physical:     'bg-blue-100 text-blue-700',
  digital:      'bg-purple-100 text-purple-700',
  voucher:      'bg-amber-100 text-amber-700',
  service_pack: 'bg-emerald-100 text-emerald-700',
};
const typeLabel: Record<string, string> = {
  physical:     'Físico',
  digital:      'Digital',
  voucher:      'Voucher',
  service_pack: 'Pack',
};

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">
      {children}
    </label>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        value ? 'bg-[#577a2c]' : 'bg-zinc-300'
      }`}
      aria-label={value ? 'Desactivar' : 'Activar'}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ShopPanel({ config, updateConfig, editorMode, negocio }: BlockEditorProps) {
  const supabase = createClient();
  const mode = editorMode ?? 'easy';
  const shop = (config.shop as any) || {};

  // Estado de productos
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado del modal nuevo producto
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Campos del formulario
  const [formName, setFormName]               = useState('');
  const [formDesc, setFormDesc]               = useState('');
  const [formPrice, setFormPrice]             = useState('');
  const [formType, setFormType]               = useState('physical');
  const [formStock, setFormStock]             = useState('');
  const [formStockUnlimited, setFormStockUnlimited] = useState(true);
  const [formImageUrl, setFormImageUrl]       = useState('');

  // Confirmación de borrado inline
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  // Toast de error (evita alert())
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadProducts();
  }, [negocio?.id]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  }

  /** Carga los productos activos del negocio */
  async function loadProducts() {
    if (!negocio?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('negocio_id', negocio.id)
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts((data as Product[]) || []);
    } catch (err: any) {
      showToast('Error al cargar productos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  /** Abre modal limpio para nuevo producto */
  function openNewModal() {
    setFormName('');
    setFormDesc('');
    setFormPrice('');
    setFormType('physical');
    setFormStock('');
    setFormStockUnlimited(true);
    setFormImageUrl('');
    setShowModal(true);
  }

  /** Inserta el producto nuevo en la base de datos */
  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('products').insert({
        negocio_id:  negocio.id,
        name:        formName.trim(),
        description: formDesc.trim() || null,
        price:       parseFloat(formPrice) || 0,
        type:        formType,
        stock:       formStockUnlimited ? null : (parseInt(formStock) >= 0 ? parseInt(formStock) : null),
        image_url:   formImageUrl || null,
        active:      true,
      });
      if (error) throw error;
      setShowModal(false);
      await loadProducts();
    } catch (err: any) {
      showToast('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  /** Activa o desactiva un producto (toggle) */
  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase
      .from('products')
      .update({ active: !current })
      .eq('id', id);
    if (!error) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !current } : p));
    } else {
      showToast('Error: ' + error.message);
    }
  }

  /** Elimina un producto (requiere confirmación inline) */
  async function confirmDelete(id: string) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      setProducts(prev => prev.filter(p => p.id !== id));
    } else {
      showToast('Error al eliminar: ' + error.message);
    }
    setProductToDelete(null);
  }

  return (
    <div className="space-y-6">

      {/* Toast de error */}
      {toast && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span>{toast}</span>
          <button onClick={() => setToast('')} className="shrink-0 p-1 hover:bg-red-100 rounded-lg" aria-label="Cerrar">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Gestión de productos (Easy + Pro) ──────────────────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">Productos</h3>
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:opacity-90 transition-all"
            style={{ backgroundColor: PRIMARY }}
          >
            <Plus size={13} /> Nuevo
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-zinc-400 py-2">Cargando productos…</p>
        ) : products.length === 0 ? (
          <div className="py-8 text-center">
            <Package size={32} className="mx-auto text-zinc-200 mb-2" />
            <p className="text-xs text-zinc-400">Sin productos. Creá el primero con el botón de arriba.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map(product => (
              <div key={product.id}>
                <div className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                  {/* Thumbnail */}
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-100 shrink-0 flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={16} className="text-zinc-300" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-900 truncate">{product.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${typeBadgeClass[product.type] || 'bg-zinc-100 text-zinc-500'}`}>
                        {typeLabel[product.type] || product.type}
                      </span>
                      <span className="text-[11px] text-zinc-500">${product.price.toLocaleString('es-AR')}</span>
                      <span className="text-[11px] text-zinc-400">
                        Stock: {product.stock !== null ? product.stock : '∞'}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Toggle
                      value={product.active}
                      onChange={() => toggleActive(product.id, product.active)}
                    />
                    <button
                      onClick={() => setProductToDelete(product.id)}
                      className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Confirmación inline de eliminación */}
                {productToDelete === product.id && (
                  <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs">
                    <span className="flex-1 text-red-700 font-medium">¿Eliminar este producto?</span>
                    <button
                      onClick={() => confirmDelete(product.id)}
                      className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setProductToDelete(null)}
                      className="px-3 py-1 rounded-lg border border-zinc-300 text-zinc-600 font-bold hover:bg-zinc-100 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Config visual (Easy + Pro) ──────────────────────────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
          <span className="w-2 h-2 rounded-full bg-zinc-400" />
          <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">Apariencia</h3>
        </div>

        <div className="flex items-center justify-between">
          <Label>Mostrar sección</Label>
          <Toggle
            value={shop.mostrar !== false}
            onChange={v => updateConfig('shop', 'mostrar', v)}
          />
        </div>

        <div>
          <Label>Título de sección</Label>
          <input
            type="text"
            value={shop.titulo || 'Tienda'}
            onChange={e => updateConfig('shop', 'titulo', e.target.value)}
            className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
          />
        </div>
      </section>

      {/* ── Configuración avanzada (Pro only) ──────────────────────────── */}
      {mode === 'pro' && (
        <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">
              Configuración avanzada
            </h3>
          </div>

          {/* Columnas de la grilla */}
          <div>
            <Label>Columnas en grilla</Label>
            <div className="flex gap-2">
              {([['2', '2 cols'], ['3', '3 cols'], ['4', '4 cols']] as [string, string][]).map(
                ([val, lbl]) => (
                  <button
                    key={val}
                    onClick={() => updateConfig('shop', 'columns', val)}
                    className={`flex-1 py-2 text-xs border rounded-lg font-medium transition-all ${
                      (shop.columns || '3') === val
                        ? 'border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold'
                        : 'bg-white text-zinc-500 border-zinc-200'
                    }`}
                  >
                    {lbl}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Mostrar filtros */}
          <div className="flex items-center justify-between">
            <Label>Mostrar filtros</Label>
            <Toggle
              value={shop.showFilters !== false}
              onChange={v => updateConfig('shop', 'showFilters', v)}
            />
          </div>

          {/* Texto del botón CTA */}
          <div>
            <Label>Texto del botón</Label>
            <input
              type="text"
              value={shop.ctaText || 'Agregar'}
              onChange={e => updateConfig('shop', 'ctaText', e.target.value)}
              className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
            />
          </div>
        </section>
      )}

      {/* ── Modal nuevo producto ────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="font-bold text-lg">Nuevo producto</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Nombre */}
              <div>
                <Label>Nombre *</Label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ej: Remera oversize"
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
                />
              </div>

              {/* Descripción */}
              <div>
                <Label>Descripción</Label>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Descripción opcional del producto"
                  rows={3}
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none resize-none"
                />
              </div>

              {/* Precio */}
              <div>
                <Label>Precio (ARS)</Label>
                <input
                  type="number"
                  value={formPrice}
                  onChange={e => setFormPrice(e.target.value)}
                  placeholder="0"
                  min={0}
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
                />
              </div>

              {/* Tipo */}
              <div>
                <Label>Tipo de producto</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PRODUCT_TYPES.map(pt => (
                    <button
                      key={pt.value}
                      onClick={() => setFormType(pt.value)}
                      className={`py-2 text-xs border rounded-lg font-medium transition-all ${
                        formType === pt.value
                          ? 'border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold'
                          : 'bg-white text-zinc-500 border-zinc-200'
                      }`}
                    >
                      {pt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock */}
              <div>
                <Label>Stock</Label>
                <label className="flex items-center gap-2 text-sm mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formStockUnlimited}
                    onChange={e => setFormStockUnlimited(e.target.checked)}
                    className="rounded"
                  />
                  Ilimitado
                </label>
                {!formStockUnlimited && (
                  <input
                    type="number"
                    value={formStock}
                    onChange={e => setFormStock(e.target.value)}
                    placeholder="Ej: 10"
                    min={0}
                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
                  />
                )}
              </div>

              {/* Imagen */}
              <ImageUpload
                label="Foto del producto"
                value={formImageUrl}
                onChange={setFormImageUrl}
              />
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-zinc-100">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: PRIMARY }}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
