"use client";
// blocks/shop/public/ShopSection.tsx
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
import { X, Trash2, ChevronLeft, CheckCircle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { BlockSectionProps } from '@/types/blocks';
import { createOrder } from "@/blocks/shop/actions";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  type: 'physical' | 'digital' | 'voucher' | 'service_pack';
  stock: number | null;
  image_url: string | null;
  active: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

/** Clases de color por tipo de producto */
const typeBadgeClass: Record<Product['type'], string> = {
  physical:     'bg-blue-100 text-blue-700',
  digital:      'bg-purple-100 text-purple-700',
  voucher:      'bg-amber-100 text-amber-700',
  service_pack: 'bg-emerald-100 text-emerald-700',
};

/** Etiquetas legibles por tipo */
const typeLabel: Record<Product['type'], string> = {
  physical:     'Físico',
  digital:      'Digital',
  voucher:      'Voucher',
  service_pack: 'Pack',
};

type FilterType = 'all' | 'physical' | 'digital' | 'voucher';

export default function ShopSection({ negocio, config }: BlockSectionProps) {
  const supabase = createClient();

  const colors = config?.colors as { primary?: string } | undefined;
  const PRIMARY = colors?.primary || negocio?.color_principal || '#577a2c';

  const [products, setProducts]     = useState<Product[]>([]);
  const [loading, setLoading]       = useState(true);
  const [cartItems, setCartItems]   = useState<CartItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showCart, setShowCart]     = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form' | 'success'>('cart');
const [customerName, setCustomerName] = useState('');
const [customerEmail, setCustomerEmail] = useState('');
const [customerPhone, setCustomerPhone] = useState('');
const [submitting, setSubmitting] = useState(false);
const [orderError, setOrderError] = useState('');

  // Carga de productos al montar
  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('negocio_id', negocio.id)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (!error && data) setProducts(data as Product[]);
      setLoading(false);
    }
    loadProducts();
  }, [negocio.id]);

  /** Agrega o incrementa un producto en el carrito */
  function addToCart(product: Product) {
    setCartItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  /** Elimina un producto del carrito */
  function removeFromCart(productId: string) {
    setCartItems(prev => prev.filter(i => i.product.id !== productId));
  }
  function updateQuantity(productId: string, newQty: number) {
  if (newQty < 1) {
    removeFromCart(productId);
    return;
  }
  setCartItems(prev => prev.map(i => {
    if (i.product.id === productId) {
      const maxQty = i.product.stock !== null ? i.product.stock : newQty;
      return { ...i, quantity: Math.min(newQty, maxQty) };
    }
    return i;
  }));
}

function closeCart() {
  setShowCart(false);
  if (checkoutStep === 'success') {
    setTimeout(() => {
      setCheckoutStep('cart');
      setCartItems([]);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setOrderError('');
    }, 300);
  }
}

function backToCart() {
  setCheckoutStep('cart');
  setOrderError('');
}

async function handleCheckout() {
  if (!customerEmail.trim()) {
    setOrderError('El email es obligatorio');
    return;
  }
  setSubmitting(true);
  setOrderError('');
  try {
    const result = await createOrder(negocio.slug, {
      customerName: customerName.trim() || 'Cliente',
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim() || undefined,
      items: cartItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      })),
    });
    if (!result.success) throw new Error(result.error || 'Error al procesar el pedido');
    setCheckoutStep('success');
  } catch (err: any) {
    setOrderError(err.message || 'Error al procesar el pedido');
  } finally {
    setSubmitting(false);
  }
}

  /** Total del carrito */
  const cartTotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  /** Productos filtrados según la pestaña activa */
  const filteredProducts = activeFilter === 'all'
    ? products
    : products.filter(p => p.type === activeFilter);

  const filterLabels: Record<FilterType, string> = {
    all:      'Todos',
    physical: 'Físicos',
    digital:  'Digitales',
    voucher:  'Vouchers',
  };

  if (loading) {
    return (
      <section className="py-20 px-6 text-center text-zinc-400">
        Cargando tienda…
      </section>
    );
  }

  return (
    <>
      <section className="py-20 px-6 max-w-7xl mx-auto">
        {/* Título */}
        <h2 className="text-3xl font-bold mb-4 text-center">Tienda</h2>

        {/* Pestañas de filtro */}
        <div className="flex gap-2 justify-center mb-10 flex-wrap">
          {(['all', 'physical', 'digital', 'voucher'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeFilter === f
                  ? 'text-white'
                  : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
              }`}
              style={activeFilter === f ? { backgroundColor: PRIMARY } : {}}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {/* Grilla de productos — 2 cols mobile, 3 tablet, 4 desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(product => {
            const inCart = cartItems.find(i => i.product.id === product.id);
            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm hover:shadow-md transition-all group"
              >
                {/* Imagen */}
                <div className="aspect-square bg-zinc-100 relative overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-zinc-300">
                      🛍️
                    </div>
                  )}

                  {/* Badge de tipo */}
                  <span
                    className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${typeBadgeClass[product.type]}`}
                  >
                    {typeLabel[product.type]}
                  </span>

                  {/* Badge de stock bajo */}
                  {product.stock !== null && product.stock <= 5 && product.stock > 0 && (
                    <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                      ¡Últimas {product.stock}!
                    </span>
                  )}

                  {/* Overlay agotado */}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">Agotado</span>
                    </div>
                  )}
                </div>

                {/* Info del producto */}
                <div className="p-3">
                  <p className="font-bold text-sm text-zinc-900 line-clamp-2">{product.name}</p>
                  {product.description && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="font-black text-lg text-zinc-900">
                      ${product.price.toLocaleString('es-AR')}
                    </span>
                    <button
                      onClick={() => product.stock !== 0 && addToCart(product)}
                      disabled={product.stock === 0}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      {inCart
                        ? `En carrito (${inCart.quantity})`
                        : 'Agregar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Estado vacío */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <span className="text-6xl">🛍️</span>
            <p className="text-zinc-500 mt-4">No hay productos disponibles aún.</p>
          </div>
        )}
      </section>

      {/* Botón flotante del carrito */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => { setShowCart(true); setCheckoutStep('cart'); }}   
            className="flex items-center gap-2 px-4 py-3 text-white rounded-2xl shadow-2xl font-bold text-sm"
            style={{ backgroundColor: PRIMARY }}
          >
            🛒 {cartItems.reduce((s, i) => s + i.quantity, 0)} items — ${cartTotal.toLocaleString('es-AR')}
          </button>
        </div>
      )}

      {/* Panel lateral del carrito */}
      {showCart && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex justify-end" onClick={closeCart}>
          <div 
            className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" 
            onClick={e => e.stopPropagation()}
          >
            {/* ═══ PASO 1: CARRITO ═══════════════════════════════════════ */}
            {checkoutStep === 'cart' && (
              <>
                {/* Header */}
                <div className="h-14 px-4 border-b flex items-center justify-between">
                  <h3 className="font-bold">
                    Tu carrito ({cartItems.reduce((s, i) => s + i.quantity, 0)})
                  </h3>
                  <button
                    onClick={closeCart}
                    className="p-1.5 hover:bg-zinc-100 rounded-lg"
                    aria-label="Cerrar carrito"
                  >
                    <X size={18} />
                  </button>
                </div>
 
                {/* Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cartItems.map(item => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-3 bg-zinc-50 rounded-xl p-3"
                    >
                      {item.product.image_url && (
                        <img
                          src={item.product.image_url}
                          className="w-12 h-12 rounded-lg object-cover"
                          alt=""
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{item.product.name}</p>
                        <p className="text-xs text-zinc-500">
                          ${item.product.price.toLocaleString('es-AR')} × {item.quantity}
                        </p>
                        {/* Controles de cantidad */}
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="w-6 h-6 rounded-lg bg-zinc-200 text-zinc-600 font-bold text-sm hover:bg-zinc-300"
                          >
                            −
                          </button>
                          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.product.stock !== null && item.quantity >= item.product.stock}
                            className="w-6 h-6 rounded-lg bg-zinc-200 text-zinc-600 font-bold text-sm hover:bg-zinc-300 disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-1 text-zinc-400 hover:text-red-500 transition-colors"
                        aria-label={`Eliminar ${item.product.name}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
 
                {/* Footer con total y CTA */}
                <div className="p-4 border-t space-y-3">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${cartTotal.toLocaleString('es-AR')}</span>
                  </div>
                  <button
                    onClick={() => setCheckoutStep('form')}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    Continuar al checkout
                  </button>
                </div>
              </>
            )}
 
            {/* ═══ PASO 2: FORMULARIO DE CHECKOUT ════════════════════════ */}
            {checkoutStep === 'form' && (
              <>
                {/* Header */}
                <div className="h-14 px-4 border-b flex items-center gap-3">
                  <button
                    onClick={backToCart}
                    className="p-1.5 hover:bg-zinc-100 rounded-lg"
                    aria-label="Volver al carrito"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <h3 className="font-bold">Tus datos</h3>
                </div>
 
                {/* Formulario */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Tu nombre"
                      className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-300 outline-none"
                    />
                  </div>
 
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                      className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-300 outline-none"
                    />
                  </div>
 
                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">
                      Teléfono / WhatsApp
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="+54 9 11 1234-5678"
                      className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-300 outline-none"
                    />
                  </div>
 
                  {/* Resumen del pedido */}
                  <div className="bg-zinc-50 rounded-xl p-4 space-y-2">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase">Resumen</p>
                    {cartItems.map(item => (
                      <div key={item.product.id} className="flex justify-between text-sm">
                        <span className="text-zinc-600">
                          {item.quantity}× {item.product.name}
                        </span>
                        <span className="font-medium">
                          ${(item.product.price * item.quantity).toLocaleString('es-AR')}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-zinc-200 pt-2 mt-2 flex justify-between font-bold">
                      <span>Total</span>
                      <span>${cartTotal.toLocaleString('es-AR')}</span>
                    </div>
                  </div>
 
                  {/* Aviso de pago */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm text-amber-800">
                      <strong>📢 Importante:</strong> El negocio te contactará para coordinar el pago y envío.
                    </p>
                  </div>
 
                  {/* Error */}
                  {orderError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm text-red-700">{orderError}</p>
                    </div>
                  )}
                </div>
 
                {/* Footer */}
                <div className="p-4 border-t">
                  <button
                    onClick={handleCheckout}
                    disabled={submitting || !customerEmail.trim()}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Procesando…
                      </>
                    ) : (
                      'Confirmar pedido'
                    )}
                  </button>
                </div>
              </>
            )}
 
            {/* ═══ PASO 3: ÉXITO ═════════════════════════════════════════ */}
            {checkoutStep === 'success' && (
              <>
                {/* Header */}
                <div className="h-14 px-4 border-b flex items-center justify-between">
                  <h3 className="font-bold">¡Pedido enviado!</h3>
                  <button
                    onClick={closeCart}
                    className="p-1.5 hover:bg-zinc-100 rounded-lg"
                    aria-label="Cerrar"
                  >
                    <X size={18} />
                  </button>
                </div>
 
                {/* Contenido de éxito */}
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                    style={{ backgroundColor: `${PRIMARY}20` }}
                  >
                    <CheckCircle size={40} style={{ color: PRIMARY }} />
                  </div>
                  
                  <h2 className="text-xl font-bold text-zinc-900 mb-2">
                    ¡Gracias por tu compra!
                  </h2>
                  
                  <p className="text-zinc-500 text-sm mb-6">
                    Recibimos tu pedido correctamente. Te enviaremos un email con los detalles y nos contactaremos para coordinar el pago.
                  </p>
 
                  <div className="bg-zinc-50 rounded-xl p-4 w-full text-left space-y-2">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase">Próximos pasos</p>
                    <div className="flex items-start gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                      <span className="text-zinc-600">Revisá tu email para ver el detalle del pedido</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                      <span className="text-zinc-600">Te contactaremos para coordinar el pago</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                      <span className="text-zinc-600">Una vez confirmado, preparamos tu pedido</span>
                    </div>
                  </div>
                </div>
 
                {/* Footer */}
                <div className="p-4 border-t">
                  <button
                    onClick={closeCart}
                    className="w-full py-3 rounded-xl font-bold text-white text-sm transition-all hover:opacity-90"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    Seguir comprando
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}