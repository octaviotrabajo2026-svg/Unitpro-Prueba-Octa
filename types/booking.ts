// types/booking.ts
// Tipos compartidos para el sistema de reservas (service_booking y confirm_booking)

export interface BookingPayload {
  service: string;
  serviceName?: string;
  date?: string;          // YYYY-MM-DD
  time?: string;          // HH:mm
  start: string;          // ISO string
  end: string;            // ISO string
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  workerId?: string;
  workerName?: string;
  calendarId?: string;
  message?: string;
  images?: string[];
  precio?: number;
  duracion?: number;      // minutos
}

export interface BusyInterval {
  start: string | null | undefined;
  end: string | null | undefined;
}

export interface ActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}
