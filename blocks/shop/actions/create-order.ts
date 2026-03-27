// blocks/shop/actions/create-order.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import {
  sendNotification,
  type NegocioNotificationData,
} from '@/lib/notifications'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface CartItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface CreateOrderPayload {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: CartItem[];
  notes?: string;
}

export interface CreateOrderResult {
  success: boolean;
  error?: string;
  orderId?: string;
}

// ─── Acción Principal ────────────────────────────────────────────────────────

/**
 * Crea una nueva orden.
 * Envía notificaciones al cliente y al dueño del negocio.
 */
export async function createOrder(
  slug: string,
  payload: CreateOrderPayload
): Promise<CreateOrderResult> {
  try {
    // ═══ 1. OBTENER NEGOCIO ═══════════════════════════════════════════════════
    const { data: negocio, error: negocioError } = await supabase
      .from('negocios')
      .select('*')
      .eq('slug', slug)
      .single()

    if (negocioError || !negocio) {
      return { success: false, error: 'Negocio no encontrado' }
    }

    // ═══ 2. VALIDAR PRODUCTOS Y STOCK ═════════════════════════════════════════
    const productIds = payload.items.map(item => item.productId)
    
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('negocio_id', negocio.id)
      .eq('active', true)

    if (productsError || !products) {
      return { success: false, error: 'Error al verificar productos' }
    }

    // Verificar stock
    for (const item of payload.items) {
      const product = products.find(p => p.id === item.productId)
      if (!product) {
        return { success: false, error: `Producto "${item.productName}" no encontrado` }
      }
      if (product.stock !== null && product.stock < item.quantity) {
        return { success: false, error: `Stock insuficiente para "${item.productName}"` }
      }
    }

    // ═══ 3. CALCULAR TOTAL ════════════════════════════════════════════════════
    const total = payload.items.reduce((sum, item) => {
      const product = products.find(p => p.id === item.productId)
      return sum + (product?.price || item.price) * item.quantity
    }, 0)

    // ═══ 4. CREAR ORDEN ═══════════════════════════════════════════════════════
    const orderItems = payload.items.map(item => ({
      product_id: item.productId,
      product_name: item.productName,
      price: item.price,
      quantity: item.quantity,
    }))

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        negocio_id: negocio.id,
        customer_name: payload.customerName.trim(),
        customer_email: payload.customerEmail.trim().toLowerCase(),
        customer_phone: payload.customerPhone?.trim() || null,
        total,
        status: 'pending',
        items: orderItems,
        notes: payload.notes || null,
      })
      .select('id')
      .single()

    if (orderError) throw orderError

    // ═══ 5. ACTUALIZAR STOCK ══════════════════════════════════════════════════
    for (const item of payload.items) {
      const product = products.find(p => p.id === item.productId)
      if (product?.stock !== null) {
        await supabase
          .from('products')
          .update({ stock: product.stock - item.quantity })
          .eq('id', item.productId)
      }
    }

    // ═══ 6. ENVIAR NOTIFICACIONES ═════════════════════════════════════════════
    const configWeb = negocio.config_web || {}
    const itemsText = payload.items
      .map(item => `${item.quantity}x ${item.productName}`)
      .join(', ')

    // Generar ID corto para mostrar
    const shortOrderId = order.id.substring(0, 8).toUpperCase()

    const negocioNotif: NegocioNotificationData = {
      id: negocio.id,
      nombre: negocio.nombre,
      slug: negocio.slug,
      email: negocio.email_contacto || negocio.usuario_email,
      telefono: negocio.telefono_contacto,
      google_refresh_token: negocio.google_refresh_token,
      google_access_token: negocio.google_access_token,
      whatsapp_access_token: negocio.whatsapp_access_token,
      config_web: configWeb,
    }

    // Notificar al cliente
    await sendNotification({
      event: 'orden_recibida_cliente',
      recipient: {
        type: 'cliente',
        nombre: payload.customerName,
        email: payload.customerEmail,
        telefono: payload.customerPhone,
      },
      negocio: negocioNotif,
      variables: {
        cliente: payload.customerName,
        orden_id: shortOrderId,
        total: `$${total.toLocaleString('es-AR')}`,
        items: itemsText,
      },
    })

    // Notificar al dueño
    await sendNotification({
      event: 'orden_recibida_dueño',
      recipient: {
        type: 'dueño',
        nombre: negocio.nombre,
        email: negocio.email_contacto || negocio.usuario_email,
        telefono: negocio.telefono_contacto,
      },
      negocio: negocioNotif,
      variables: {
        cliente: payload.customerName,
        orden_id: shortOrderId,
        total: `$${total.toLocaleString('es-AR')}`,
        items: itemsText,
      },
    })

    // ═══ 7. REVALIDAR Y RETORNAR ══════════════════════════════════════════════
    revalidatePath('/dashboard')

    return { 
      success: true, 
      orderId: order.id 
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[SHOP] Error creating order:', error)
    return { success: false, error: message }
  }
}