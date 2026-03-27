// blocks/academy/actions/enroll.ts
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

export interface EnrollPayload {
  courseId: string;
  studentName?: string;
  studentEmail: string;
  studentPhone?: string;
}

export interface EnrollResult {
  success: boolean;
  error?: string;
  enrollmentId?: string;
}

// ─── Acción Principal ────────────────────────────────────────────────────────

/**
 * Inscribe un estudiante a un curso.
 * Envía notificaciones al estudiante y al dueño del negocio.
 */
export async function enrollStudent(
  slug: string,
  payload: EnrollPayload
): Promise<EnrollResult> {
  try {
    // ═══ 1. OBTENER NEGOCIO Y CURSO ═══════════════════════════════════════════
    const { data: negocio, error: negocioError } = await supabase
      .from('negocios')
      .select('*')
      .eq('slug', slug)
      .single()

    if (negocioError || !negocio) {
      return { success: false, error: 'Negocio no encontrado' }
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', payload.courseId)
      .eq('negocio_id', negocio.id)
      .single()

    if (courseError || !course) {
      return { success: false, error: 'Curso no encontrado' }
    }

    // ═══ 2. VERIFICAR SI YA ESTÁ INSCRITO ═════════════════════════════════════
    const { data: existingEnrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('course_id', payload.courseId)
      .ilike('student_email', payload.studentEmail.trim().toLowerCase())
      .limit(1)

    if (existingEnrollment && existingEnrollment.length > 0) {
      return { success: false, error: 'Ya estás inscrito en este curso' }
    }

    // ═══ 3. CREAR INSCRIPCIÓN ═════════════════════════════════════════════════
    const { data: enrollment, error: enrollError } = await supabase
      .from('course_enrollments')
      .insert({
        course_id: payload.courseId,
        student_name: payload.studentName?.trim() || null,
        student_email: payload.studentEmail.trim().toLowerCase(),
        student_phone: payload.studentPhone?.trim() || null,
        paid_amount: 0,
        status: 'enrolled',
        progress_percent: 0,
      })
      .select('id')
      .single()

    if (enrollError) throw enrollError

    // ═══ 4. ENVIAR NOTIFICACIONES ═════════════════════════════════════════════
    const configWeb = negocio.config_web || {}
    const precio = course.is_free ? '' : `$${course.price}`

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

    // Notificar al estudiante
    await sendNotification({
      event: 'inscripcion_estudiante',
      recipient: {
        type: 'cliente',
        nombre: payload.studentName || 'Estudiante',
        email: payload.studentEmail,
        telefono: payload.studentPhone,
      },
      negocio: negocioNotif,
      variables: {
        estudiante: payload.studentName || 'Estudiante',
        curso: course.title,
        precio,
      },
    })

    // Notificar al dueño
    await sendNotification({
      event: 'inscripcion_dueño',
      recipient: {
        type: 'dueño',
        nombre: negocio.nombre,
        email: negocio.email_contacto || negocio.usuario_email,
        telefono: negocio.telefono_contacto,
      },
      negocio: negocioNotif,
      variables: {
        estudiante: payload.studentName || 'Sin nombre',
        email: payload.studentEmail,
        curso: course.title,
        precio,
      },
    })

    // ═══ 5. REVALIDAR Y RETORNAR ══════════════════════════════════════════════
    revalidatePath('/dashboard')

    return { 
      success: true, 
      enrollmentId: enrollment.id 
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ACADEMY] Error enrolling student:', error)
    return { success: false, error: message }
  }
}

/**
 * Marca el pago de una inscripción.
 * Solo puede ser ejecutado por el dueño del negocio.
 */
export async function markEnrollmentPaid(
  enrollmentId: string,
  paidAmount: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('course_enrollments')
      .update({ 
        paid_amount: paidAmount,
        status: 'active',
      })
      .eq('id', enrollmentId)

    if (error) throw error

    revalidatePath('/dashboard')
    return { success: true }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ACADEMY] Error marking enrollment paid:', error)
    return { success: false, error: message }
  }
}

/**
 * Actualiza el progreso de un estudiante.
 */
export async function updateEnrollmentProgress(
  enrollmentId: string,
  progressPercent: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const status = progressPercent >= 100 ? 'completed' : 'active'

    const { error } = await supabase
      .from('course_enrollments')
      .update({ 
        progress_percent: Math.min(100, Math.max(0, progressPercent)),
        status,
      })
      .eq('id', enrollmentId)

    if (error) throw error

    revalidatePath('/dashboard')
    return { success: true }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ACADEMY] Error updating progress:', error)
    return { success: false, error: message }
  }
}