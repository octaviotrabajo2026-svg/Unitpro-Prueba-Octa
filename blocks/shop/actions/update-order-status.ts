// blocks/shop/actions/update-order-status.ts
'use server'

import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase-server'
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

export type OrderStatus = 'pending' | 'paid' | 'fulfilled' | 'cancelled'

export interface UpdateOrderStatusResult {
  success: boolean;
  error?: string;
}

// ─── Verificar Autenticación ─────────────────────────────────────────────────

async function getAuthenticatedNegocioId(): Promise<number | null> {
  const serverClient = await createServerClient()
  const { data: { user } } = await serverClient.auth.getUser()
  if (!user) return null

  const { data: negocio } = await supabase
    .from('negocios')
    .select('id')
    .eq('user_id', user.id)
    .single()

  return negocio?.id ?? null
}

// ─── Acción Principal ────────────────────────────────────────────────────────

/**
 * Actualiza el estado de una orden.
 * Envía notificaciones al cliente según el nuevo estado.
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  tracking?: string
): Promise<UpdateOrderStatusResult> {
  try {
    // ═══ 1. VERIFICAR AUTENTICACIÓN ═══════════════════════════════════════════
    const negocioId = await getAuthenticatedNegocioId()
    if (negocioId === null) {
      return { success: false, error: 'No autorizado' }
    }

    // ═══ 2. OBTENER ORDEN Y NEGOCIO ═══════════════════════════════════════════
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, negocios(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return { success: false, error: 'Orden no encontrada' }
    }

    if (order.negocio_id !== negocioId) {
      return { success: false, error: 'No autorizado' }
    }

    const negocio = order.negocios as any

    // ═══ 3. ACTUALIZAR ESTADO ═════════════════════════════════════════════════
    const updateData: any = { status: newStatus }
    if (tracking) {
      updateData.tracking = tracking
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (updateError) throw updateError

    // ═══ 4. ENVIAR NOTIFICACIONES SEGÚN ESTADO ════════════════════════════════
    const configWeb = negocio?.config_web || {}
    const shortOrderId = orderId.substring(0, 8).toUpperCase()

    const negocioNotif: NegocioNotificationData = {
      id: negocio?.id,
      nombre: negocio?.nombre || '',
      slug: negocio?.slug || '',
      email: negocio?.email_contacto,
      telefono: negocio?.telefono_contacto,
      google_refresh_token: negocio?.google_refresh_token,
      google_access_token: negocio?.google_access_token,
      whatsapp_access_token: negocio?.whatsapp_access_token,
      config_web: configWeb,
    }

    // Solo notificar en transiciones relevantes
    if (newStatus === 'paid') {
      await sendNotification({
        event: 'orden_pagada',
        recipient: {
          type: 'cliente',
          nombre: order.customer_name || 'Cliente',
          email: order.customer_email,
          telefono: order.customer_phone,
        },
        negocio: negocioNotif,
        variables: {
          cliente: order.customer_name || 'Cliente',
          orden_id: shortOrderId,
          total: `$${order.total?.toLocaleString('es-AR')}`,
        },
      })
    }

    if (newStatus === 'fulfilled') {
      await sendNotification({
        event: 'orden_enviada',
        recipient: {
          type: 'cliente',
          nombre: order.customer_name || 'Cliente',
          email: order.customer_email,
          telefono: order.customer_phone,
        },
        negocio: negocioNotif,
        variables: {
          cliente: order.customer_name || 'Cliente',
          orden_id: shortOrderId,
          total: `$${order.total?.toLocaleString('es-AR')}`,
          tracking: tracking || '',
        },
      })
    }

    // ═══ 5. SI SE CANCELA, RESTAURAR STOCK ════════════════════════════════════
    if (newStatus === 'cancelled' && order.status !== 'cancelled') {
      const items = order.items || []
      for (const item of items) {
        if (item.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single()

          if (product && product.stock !== null) {
            await supabase
              .from('products')
              .update({ stock: product.stock + (item.quantity || 1) })
              .eq('id', item.product_id)
          }
        }
      }
    }

    // ═══ 6. REVALIDAR Y RETORNAR ══════════════════════════════════════════════
    revalidatePath('/dashboard')

    return { success: true }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[SHOP] Error updating order status:', error)
    return { success: false, error: message }
  }
}

/**
 * Cancela una orden y restaura el stock.
 */
export async function cancelOrder(orderId: string): Promise<UpdateOrderStatusResult> {
  return updateOrderStatus(orderId, 'cancelled')
}

/**
 * Marca una orden como pagada.
 */
export async function markOrderPaid(orderId: string): Promise<UpdateOrderStatusResult> {
  return updateOrderStatus(orderId, 'paid')
}

/**
 * Marca una orden como enviada/completada.
 */
export async function fulfillOrder(
  orderId: string, 
  tracking?: string
): Promise<UpdateOrderStatusResult> {
  return updateOrderStatus(orderId, 'fulfilled', tracking)
}