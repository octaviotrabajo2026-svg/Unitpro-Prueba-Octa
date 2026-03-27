// lib/notifications/index.ts

import type {
  SendNotificationPayload,
  NotificationResult,
  NotificationChannel,
  NotificationConfig,
  CalendarNotificationEvent,
  CalendarTemplateVars,
  AcademyNotificationEvent,
  AcademyTemplateVars,
  ShopNotificationEvent,
  ShopTemplateVars,
} from './types';
import { sendEmail } from './channels/email';
import { sendWhatsApp } from './channels/whatsapp';
import { compileCalendarTemplate } from './templates/calendar';
import { compileAcademyTemplate } from './templates/academy';
import { compileShopTemplate } from './templates/shop';

// Re-exportar tipos
export * from './types';

// ─── Función Principal ───────────────────────────────────────────────────────

/**
 * Envía una notificación por los canales configurados.
 * 
 * @example
 * ```ts
 * await sendNotification({
 *   event: 'turno_confirmado',
 *   recipient: { type: 'cliente', nombre: 'Juan', email: 'juan@mail.com', telefono: '+5491123456789' },
 *   negocio: negocioData,
 *   variables: { cliente: 'Juan', servicio: 'Corte', fecha: '10/01', hora: '15:00' }
 * });
 * ```
 */
export async function sendNotification(
  payload: SendNotificationPayload
): Promise<NotificationResult> {
  const { event, recipient, negocio, variables, forceChannels } = payload;

  const result: NotificationResult = {
    success: false,
    channels: {},
  };

  // Obtener configuración de notificación para este evento
  const notifConfig = (negocio.config_web?.notifications?.[event] as NotificationConfig) || {
    enabled: true,
    sendViaEmail: true,
    sendViaWhatsapp: true,
  };

  // Si está deshabilitado, salir
  if (notifConfig.enabled === false) {
    console.log(`[NOTIF] ${event} deshabilitado para negocio ${negocio.id}`);
    result.success = true; // No es error, simplemente está deshabilitado
    return result;
  }

  // Determinar canales a usar
  const channels: NotificationChannel[] = forceChannels || [];
  if (!forceChannels) {
    if (notifConfig.sendViaEmail !== false && recipient.email) {
      channels.push('email');
    }
    if (notifConfig.sendViaWhatsapp !== false && recipient.telefono && negocio.whatsapp_access_token) {
      channels.push('whatsapp');
    }
  }

  if (channels.length === 0) {
    console.log(`[NOTIF] ${event}: Sin canales disponibles para ${recipient.nombre}`);
    result.success = true; // No es error, simplemente no hay canales
    return result;
  }

  // Compilar templates según el tipo de evento
  const compiled = compileTemplate(event, variables, notifConfig);

  if (!compiled) {
    console.warn(`[NOTIF] No se pudo compilar template para evento: ${event}`);
    return result;
  }

  // Enviar por cada canal
  const promises: Promise<void>[] = [];

  if (channels.includes('email') && compiled.email && recipient.email) {
    promises.push(
      sendEmail({
        to: recipient.email,
        subject: compiled.email.subject,
        html: compiled.email.html,
        refreshToken: negocio.google_refresh_token || '',
        accessToken: negocio.google_access_token,
      }).then((res) => {
        result.channels.email = res;
      })
    );
  }

  if (channels.includes('whatsapp') && compiled.whatsapp && recipient.telefono) {
    promises.push(
      sendWhatsApp({
        to: recipient.telefono,
        text: compiled.whatsapp.text,
        instanceName: negocio.whatsapp_access_token || '',
        imageUrl: compiled.whatsapp.imageUrl,
      }).then((res) => {
        result.channels.whatsapp = res;
      })
    );
  }

  // Esperar todos los envíos
  await Promise.all(promises);

  // Determinar éxito global
  const emailSent = result.channels.email?.sent ?? true;
  const whatsappSent = result.channels.whatsapp?.sent ?? true;
  result.success = emailSent || whatsappSent;

  console.log(`[NOTIF] ${event} → ${recipient.nombre}: Email=${emailSent}, WA=${whatsappSent}`);

  return result;
}

// ─── Compilador de Templates ─────────────────────────────────────────────────

function compileTemplate(
  event: string,
  variables: any,
  config?: NotificationConfig
) {
  // Eventos de Calendar
  const calendarEvents: CalendarNotificationEvent[] = [
    'turno_creado_cliente',
    'turno_pendiente_dueño',
    'seña_requerida',
    'turno_confirmado',
    'turno_confirmado_dueño',
    'turno_cancelado',
    'turno_reagendado',
    'recordatorio',
  ];

  if (calendarEvents.includes(event as CalendarNotificationEvent)) {
    return compileCalendarTemplate(
      event as CalendarNotificationEvent,
      variables as CalendarTemplateVars,
      config
    );
  }

  // Eventos de Academy
  const academyEvents: AcademyNotificationEvent[] = [
    'inscripcion_estudiante',
    'inscripcion_dueño',
    'curso_inicia',
  ];

  if (academyEvents.includes(event as AcademyNotificationEvent)) {
    return compileAcademyTemplate(
      event as AcademyNotificationEvent,
      variables as AcademyTemplateVars,
      config
    );
  }

  // Eventos de Shop
  const shopEvents: ShopNotificationEvent[] = [
    'orden_recibida_cliente',
    'orden_recibida_dueño',
    'orden_pagada',
    'orden_enviada',
  ];

  if (shopEvents.includes(event as ShopNotificationEvent)) {
    return compileShopTemplate(
      event as ShopNotificationEvent,
      variables as ShopTemplateVars,
      config
    );
  }

  console.warn(`[NOTIF] Evento no reconocido: ${event}`);
  return null;
}

// ─── Helpers Adicionales ─────────────────────────────────────────────────────

/**
 * Envía notificación al dueño/profesional cuando se crea un turno.
 * Determina automáticamente el destinatario basado en el config del negocio.
 */
export async function notifyOwnerNewAppointment(
  negocio: SendNotificationPayload['negocio'],
  turnoData: {
    clienteNombre: string;
    clienteTelefono: string;
    servicio: string;
    fecha: string;
    hora: string;
    profesionalId?: string;
    profesionalNombre?: string;
  }
): Promise<NotificationResult> {
  // Buscar el profesional asignado si existe
  const equipo = negocio.config_web?.equipo?.items || [];
  let destinatario: { type: 'dueño' | 'profesional'; nombre: string; email?: string; telefono?: string } = {
    type: 'dueño' as const,
    nombre: negocio.nombre,
    email: negocio.email,
    telefono: negocio.telefono,
  };

  // Si hay profesional asignado, notificar a ese profesional
  if (turnoData.profesionalId) {
    const profesional = equipo.find((p: any) => String(p.id) === String(turnoData.profesionalId));
    if (profesional?.email || profesional?.telefono) {
      destinatario = {
        type: 'profesional',
        nombre: profesional.nombre || turnoData.profesionalNombre || 'Profesional',
        email: profesional.email,
        telefono: profesional.telefono,
      };
    }
  }

  return sendNotification({
    event: 'turno_pendiente_dueño',
    recipient: destinatario,
    negocio,
    variables: {
      cliente: turnoData.clienteNombre,
      telefono: turnoData.clienteTelefono,
      servicio: turnoData.servicio,
      fecha: turnoData.fecha,
      hora: turnoData.hora,
      profesional: turnoData.profesionalNombre,
    },
  });
}

/**
 * Formatea una fecha ISO a formato legible en Argentina.
 */
export function formatFechaArgentina(isoDate: string): { fecha: string; hora: string } {
  const date = new Date(isoDate);
  const fecha = date.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const hora = date.toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
  });
  return { fecha, hora };
}

/**
 * Calcula el tiempo restante hasta una fecha.
 */
export function getTiempoRestante(isoDate: string): string {
  const now = new Date();
  const target = new Date(isoDate);
  const diffMs = target.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours <= 0) return 'ahora';
  if (diffHours < 24) return `en ${diffHours} horas`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return 'mañana';
  return `en ${diffDays} días`;
}