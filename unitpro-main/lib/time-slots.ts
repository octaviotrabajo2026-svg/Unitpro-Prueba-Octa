// lib/time-slots.ts
// Utilidad compartida para generar slots de tiempo disponibles.
// Antes estaba duplicada (~80 líneas) en ServiceBookingLanding y ConfirmBookingLanding.

import { BusyInterval } from '@/types/booking'
import { WeeklySchedule } from '@/types/web-config'

export interface TimeSlot {
  time: string;       // "HH:mm"
  available: boolean;
}

export interface TimeSlotOptions {
  date: string;             // "YYYY-MM-DD"
  serviceDuration: number;  // minutos
  schedule: WeeklySchedule;
  busySlots: BusyInterval[];
  intervalStep?: number;    // minutos entre cada slot (default: 30)
  workerSchedule?: WeeklySchedule; // schedule específico del profesional (per_worker)
}

/**
 * Genera los slots de tiempo disponibles para una fecha dada.
 * Usa el schedule del negocio o del profesional (si se provee workerSchedule).
 */
export function generateTimeSlots(options: TimeSlotOptions): TimeSlot[] {
  const { date, serviceDuration, busySlots, intervalStep = 30, workerSchedule } = options
  const schedule = workerSchedule || options.schedule

  if (!date) return []

  const [year, month, day] = date.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)
  const dayOfWeek = String(dateObj.getDay()) // "0" = Domingo, "1" = Lunes...

  const dayConfig = schedule[dayOfWeek]
  if (!dayConfig || !dayConfig.isOpen) return []

  // Normalizar rangos (soporta estructura vieja con start/end y nueva con ranges[])
  let ranges: { start: string; end: string }[] = []
  if (dayConfig.ranges && Array.isArray(dayConfig.ranges) && dayConfig.ranges.length > 0) {
    ranges = dayConfig.ranges
  } else {
    ranges = [{ start: '09:00', end: '18:00' }]
  }

  const slots: TimeSlot[] = []

  for (const range of ranges) {
    const [startH, startM] = range.start.split(':').map(Number)
    const [endH, endM] = range.end.split(':').map(Number)

    const rangeClosingTime = new Date(
      `${date}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00`
    )

    for (let hour = startH; hour <= endH; hour++) {
      for (let min = 0; min < 60; min += intervalStep) {
        if (hour === startH && min < startM) continue
        if (hour > endH || (hour === endH && min >= endM)) break

        const timeString = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
        const slotStart = new Date(`${date}T${timeString}:00`)
        const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60000)

        // El servicio debe terminar antes de que cierre el rango
        if (slotEnd > rangeClosingTime) continue

        // Verificar colisión con slots ocupados de Google Calendar
        const isBusy = busySlots.some(busy => {
          if (!busy.start || !busy.end) return false
          const busyStart = new Date(busy.start)
          const busyEnd = new Date(busy.end)
          return slotStart < busyEnd && slotEnd > busyStart
        })

        if (!isBusy) {
          slots.push({ time: timeString, available: true })
        }
      }
    }
  }

  return slots.sort((a, b) => a.time.localeCompare(b.time))
}

/**
 * Retorna la fecha de hoy como string "YYYY-MM-DD" en hora local.
 */
export function getLocalDateString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Verifica si el negocio está cerrado en el día de la fecha dada.
 */
export function isDayClosed(date: string, schedule: WeeklySchedule): boolean {
  const [year, month, day] = date.split('-').map(Number)
  const dayIndex = new Date(year, month - 1, day).getDay()
  return schedule[String(dayIndex)]?.isOpen === false
}
