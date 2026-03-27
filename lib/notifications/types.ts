// lib/notifications/types.ts

import type { WebConfig } from "@/types/web-config";

// ─── Eventos de Notificación ─────────────────────────────────────────────────

export type CalendarNotificationEvent =
  | 'turno_creado_cliente'       // Al crear turno auto-confirmado → cliente
  | 'turno_pendiente_dueño'      // Al crear turno que requiere aprobación → dueño
  | 'seña_requerida'             // Al aprobar turno con seña → cliente
  | 'turno_confirmado'           // Al confirmar o marcar pagado → cliente
  | 'turno_confirmado_dueño'     // Al confirmar turno → dueño/profesional
  | 'turno_cancelado'            // Al cancelar → cliente
  | 'turno_reagendado'           // Al reagendar → cliente
  | 'recordatorio';              // Cron configurable → cliente

export type AcademyNotificationEvent =
  | 'inscripcion_estudiante'     // Al inscribirse → estudiante
  | 'inscripcion_dueño'          // Al inscribirse → dueño
  | 'curso_inicia';              // Cuando empieza el curso → estudiante

export type ShopNotificationEvent =
  | 'orden_recibida_cliente'     // Nueva orden → cliente
  | 'orden_recibida_dueño'       // Nueva orden → dueño
  | 'orden_pagada'               // Orden pagada → cliente
  | 'orden_enviada';             // Orden enviada → cliente

export type NotificationEvent = 
  | CalendarNotificationEvent 
  | AcademyNotificationEvent 
  | ShopNotificationEvent;

// ─── Canales ─────────────────────────────────────────────────────────────────

export type NotificationChannel = 'email' | 'whatsapp';

// ─── Destinatarios ───────────────────────────────────────────────────────────

export type RecipientType = 'cliente' | 'dueño' | 'profesional';

export interface Recipient {
  type: RecipientType;
  nombre: string;
  email?: string;
  telefono?: string;
}

// ─── Variables para Templates ────────────────────────────────────────────────

export interface CalendarTemplateVars {
  cliente: string;
  servicio: string;
  fecha?: string;
  hora?: string;
  profesional?: string;
  precio_total?: string;
  monto_senia?: string;
  precio_a_pagar?: string;
  alias?: string;
  telefono?: string;
  telefono_trabajador?: string;
  duracion?: string;
  hora_fin?: string;
  tiempo_restante?: string;
  link_pago?: string;
}

export interface AcademyTemplateVars {
  estudiante: string;
  curso: string;
  precio?: string;
  fecha_inicio?: string;
  email?: string;
}

export interface ShopTemplateVars {
  cliente: string;
  orden_id: string;
  total: string;
  items?: string;
  tracking?: string;
}

export type TemplateVars = CalendarTemplateVars | AcademyTemplateVars | ShopTemplateVars;

// ─── Configuración de Notificación (en config_web) ───────────────────────────

export interface NotificationConfig {
  enabled?: boolean;
  sendViaEmail?: boolean;
  sendViaWhatsapp?: boolean;
  emailSubject?: string;
  emailBody?: string;
  whatsappBody?: string;
  bannerUrl?: string;
}

export interface NotificationsConfig {
  reminderHours?: number;  // 2 | 4 | 12 | 24
  [key: string]: NotificationConfig | number | undefined;
}

// ─── Datos del Negocio para Notificaciones ───────────────────────────────────

export interface NegocioNotificationData {
  id: number;
  nombre: string;
  slug: string;
  email?: string;
  telefono?: string;
  google_refresh_token?: string;
  google_access_token?: string;
  whatsapp_access_token?: string;  // Evolution API instance name
  config_web?: WebConfig & { notifications?: NotificationsConfig };
}

// ─── Payload Principal ───────────────────────────────────────────────────────

export interface SendNotificationPayload {
  event: NotificationEvent;
  recipient: Recipient;
  negocio: NegocioNotificationData;
  variables: TemplateVars;
  /** Forzar canales específicos (ignora config del negocio) */
  forceChannels?: NotificationChannel[];
}

// ─── Respuesta ───────────────────────────────────────────────────────────────

export interface NotificationResult {
  success: boolean;
  channels: {
    email?: { sent: boolean; error?: string };
    whatsapp?: { sent: boolean; error?: string };
  };
}

// ─── Template Compilado ──────────────────────────────────────────────────────

export interface CompiledTemplate {
  email?: {
    subject: string;
    html: string;
  };
  whatsapp?: {
    text: string;
    imageUrl?: string;
  };
}