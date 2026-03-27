"use client";
// blocks/shop/admin/ShopAdmin.tsx
//
// SQL to run in Supabase (execute manually):
// CREATE TABLE IF NOT EXISTS products (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   negocio_id integer REFERENCES negocios(id) ON DELETE CASCADE,
//   name text NOT NULL,
//   description text,
//   price numeric(10,2) NOT NULL DEFAULT 0,
//   type text NOT NULL DEFAULT 'physical', -- 'physical' | 'digital' | 'voucher' | 'service_pack'
//   stock integer,
//   image_url text,
//   digital_file_url text,
//   active boolean DEFAULT true,
//   metadata jsonb DEFAULT '{}',
//   created_at timestamptz DEFAULT now()
// );
// CREATE TABLE IF NOT EXISTS orders (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   negocio_id integer REFERENCES negocios(id) ON DELETE CASCADE,
//   customer_name text,
//   customer_email text,
//   total numeric(10,2) NOT NULL DEFAULT 0,
//   status text NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'fulfilled' | 'cancelled'
//   items jsonb DEFAULT '[]',
//   created_at timestamptz DEFAULT now()
// );

import { useState, useEffect } from 'react';
import { Plus, Edit2, ShoppingBag, Package, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { BlockAdminProps } from '@/types/blocks';
import { markOrderPaid, fulfillOrder, cancelOrder } from "@/blocks/shop/actions";

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

interface Order {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  total: number;
  status: string;
  items: any[];
  created_at: string;
}

const PRIMARY = '#577a2c';

/** Badge de color para tipo de producto */
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

/** Badge de color para estado de orden */
const orderStatusClass: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  paid:      'bg-blue-100 text-blue-700',
  fulfilled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};
const orderStatusLabel: Record<string, string> = {
  pending:   'Pendiente',
  paid:      'Pagado',
  fulfilled: 'Completado',
  cancelled: 'Cancelado',
};

const PRODUCT_TYPES = [
  { value: 'physical',     label: 'Físico' },
  { value: 'digital',      label: 'Digital' },
  { value: 'voucher',      label: 'Voucher' },
  { value: 'service_pack', label: 'Pack' },
];

export default function ShopAdmin({ negocio }: BlockAdminProps) {
  const supabase = createClient();

  const [tab, setTab]           = useState<'productos' | 'ordenes'>('productos');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);

  // Estado del modal de nuevo/editar producto
  const [showModal, setShowModal]   = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  // Campos del formulario
  const [formName, setFormName]         = useState('');
  const [formDesc, setFormDesc]         = useState('');
  const [formPrice, setFormPrice]       = useState('');
  const [formType, setFormType]         = useState('physical');
  const [formStock, setFormStock]       = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formStockUnlimited, setFormStockUnlimited] = useState(false);
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    loadData();
  }, [negocio.id]);

  /** Carga productos y órdenes del negocio */
  async function loadData() {
    setLoading(true);
    const [{ data: prods }, { data: ords }] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('negocio_id', negocio.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select('*')
        .eq('negocio_id', negocio.id)
        .order('created_at', { ascending: false }),
    ]);
    if (prods) setProducts(prods as Product[]);
    if (ords)  setOrders(ords as Order[]);
    setLoading(false);
  }

  /** Abre el modal para crear un producto nuevo */
  function openNewModal() {
    setEditProduct(null);
    setFormName('');
    setFormDesc('');
    setFormPrice('');
    setFormType('physical');
    setFormStock('');
    setFormImageUrl('');
    setFormStockUnlimited(false);
    setShowModal(true);
  }

  /** Abre el modal precargado con los datos de un producto existente */
  function openEditModal(product: Product) {
    setEditProduct(product);
    setFormName(product.name);
    setFormDesc(product.description || '');
    setFormPrice(String(product.price));
    setFormType(product.type);
    setFormStock(product.stock !== null ? String(product.stock) : '');
    setFormImageUrl(product.image_url || '');
    setFormStockUnlimited(product.stock === null);
    setShowModal(true);
  }

  /** Guarda (insert o update) el producto */
  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        negocio_id: negocio.id,
        name:       formName.trim(),
        description: formDesc.trim() || null,
        price:      parseFloat(formPrice) || 0,
        type:       formType,
        stock:      formStockUnlimited ? null : (parseInt(formStock) >= 0 ? parseInt(formStock) : null),
        image_url:  formImageUrl || null,
      };

      if (editProduct) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert({ ...payload, active: true });
        if (error) throw error;
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  /** Activa / desactiva un producto */
  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase
      .from('products')
      .update({ active: !current })
      .eq('id', id);
    if (!error) {
      setProducts(prev =>
        prev.map(p => p.id === id ? { ...p, active: !current } : p)
      );
    } else {
      alert('Error: ' + error.message);
    }
  }

  /** Marca una orden como completada */
  async function markOrderFulfilled(id: string) {
  const result = await fulfillOrder(id);
  if (result.success) {
    setOrders(prev =>
      prev.map(o => o.id === id ? { ...o, status: 'fulfilled' } : o)
    );
  } else {
    alert('Error: ' + (result.error || 'No se pudo completar'));
  }
}

  return (
    <div className="max-w-4xl animate-in fade-in">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag size={24} style={{ color: PRIMARY }} />
          Tienda Online
        </h1>
        <p className="text-zinc-500 text-sm">Gestioná tus productos y órdenes de compra.</p>
      </header>

      {/* Selector de tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 w-fit mb-6">
        {(['productos', 'ordenes'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all capitalize ${
              tab === t ? 'bg-white shadow text-zinc-900' : 'text-zinc-500'
            }`}
          >
            {t === 'productos'
              ? `Productos (${products.length})`
              : `Órdenes (${orders.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-zinc-400 text-sm">Cargando…</p>
      ) : (
        <>
          {/* ── TAB PRODUCTOS ────────────────────────────────────────── */}
          {tab === 'productos' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-zinc-500">{products.length} productos registrados</p>
                <button
                  onClick={openNewModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90"
                  style={{ backgroundColor: PRIMARY }}
                >
                  <Plus size={16} /> Nuevo producto
                </button>
              </div>

              {products.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
                  <ShoppingBag size={40} className="mx-auto text-zinc-200 mb-3" />
                  <h3 className="text-lg font-bold text-zinc-900">Sin productos aún</h3>
                  <p className="text-zinc-500 text-sm mt-1">
                    Creá tu primer producto con el botón de arriba.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {products.map(product => (
                    <div
                      key={product.id}
                      className="flex items-center gap-4 bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm"
                    >
                      {/* Thumbnail */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 shrink-0 flex items-center justify-center">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package size={20} className="text-zinc-300" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-zinc-900 truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeBadgeClass[product.type] || 'bg-zinc-100 text-zinc-500'}`}
                          >
                            {typeLabel[product.type] || product.type}
                          </span>
                          <span className="text-xs text-zinc-500">
                            ${product.price.toLocaleString('es-AR')}
                          </span>
                          <span className="text-xs text-zinc-400">
                            Stock: {product.stock !== null ? product.stock : '∞'}
                          </span>
                        </div>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Toggle activo */}
                        <button
                          onClick={() => toggleActive(product.id, product.active)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            product.active ? 'bg-[#577a2c]' : 'bg-zinc-300'
                          }`}
                          aria-label={product.active ? 'Desactivar' : 'Activar'}
                        >
                          <span
                            className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                              product.active ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>

                        {/* Editar */}
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                          aria-label="Editar producto"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB ÓRDENES ──────────────────────────────────────────── */}
          {tab === 'ordenes' && (
            <div>
              {orders.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
                  <Package size={40} className="mx-auto text-zinc-200 mb-3" />
                  <h3 className="text-lg font-bold text-zinc-900">Sin órdenes aún</h3>
                  <p className="text-zinc-500 text-sm mt-1">
                    Las órdenes aparecerán aquí cuando los clientes compren.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200">
                        <th className="text-left py-3 px-4 text-xs font-bold text-zinc-400 uppercase">Fecha</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-zinc-400 uppercase">Cliente</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-zinc-400 uppercase">Items</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-zinc-400 uppercase">Total</th>
                        <th className="text-left py-3 px-4 text-xs font-bold text-zinc-400 uppercase">Estado</th>
                        <th className="py-3 px-4" />
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr
                          key={order.id}
                          className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
                        >
                          <td className="py-3 px-4 text-zinc-500 whitespace-nowrap">
                            {new Date(order.created_at).toLocaleDateString('es-AR', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-zinc-900">
                              {order.customer_name || 'Anónimo'}
                            </p>
                            {order.customer_email && (
                              <p className="text-xs text-zinc-400">{order.customer_email}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-zinc-500">
                            {Array.isArray(order.items) ? order.items.length : '—'}
                          </td>
                          <td className="py-3 px-4 font-bold text-zinc-900">
                            ${order.total.toLocaleString('es-AR')}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                orderStatusClass[order.status] || 'bg-zinc-100 text-zinc-500'
                              }`}
                            >
                              {orderStatusLabel[order.status] || order.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {order.status !== 'fulfilled' && order.status !== 'cancelled' && (
                              <button
                                onClick={() => markOrderFulfilled(order.id)}
                                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 transition-colors"
                              >
                                Completar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── MODAL NUEVO / EDITAR PRODUCTO ────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header del modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="font-bold text-lg">
                {editProduct ? 'Editar producto' : 'Nuevo producto'}
              </h2>
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
                <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">
                  Nombre *
                </label>
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
                <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">
                  Descripción
                </label>
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
                <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">
                  Precio (ARS)
                </label>
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
                <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-2">
                  Tipo de producto
                </label>
                <div className="grid grid-cols-4 gap-2">
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
                <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-2">
                  Stock
                </label>
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

              {/* Foto */}
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
