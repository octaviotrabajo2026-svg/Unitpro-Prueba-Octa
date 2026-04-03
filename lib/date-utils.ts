// lib/date-utils.ts
// Utilidades para parsear fechas de turnos almacenadas en Supabase.
//
// Los strings de fecha en Supabase se guardan como hora argentina sin offset
// (ej: "2026-04-06T14:00:00"). JavaScript los interpreta como UTC si no tienen
// sufijo, lo que produce un desfase de 3 horas al mostrarlos.
// parseAsArgentinaTime agrega el offset -03:00 cuando el string no lo tiene.

/**
 * Parsea un string de fecha de turno tratándolo como hora argentina (UTC-3).
 * Si el string ya tiene offset o termina en Z, lo respeta tal cual.
 * @param dateStr - ISO 8601 sin offset (ej: "2026-04-06T14:00:00")
 * @returns Date correctamente posicionada en el tiempo
 */
export function parseAsArgentinaTime(dateStr: string): Date {
  if (!dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:\d{2}$/)) {
    return new Date(dateStr + '-03:00');
  }
  return new Date(dateStr);
}
