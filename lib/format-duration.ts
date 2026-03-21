/**
 * Formatea una duración en minutos a formato legible.
 * Ej: 30 → "30 min", 60 → "1 hora", 90 → "1 hora y 30 min"
 */
export function formatDuration(mins: number): string {
  if (!mins || mins < 60) return `${mins || 0} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0
    ? `${h} hora${h > 1 ? "s" : ""} y ${m} min`
    : `${h} hora${h > 1 ? "s" : ""}`;
}
