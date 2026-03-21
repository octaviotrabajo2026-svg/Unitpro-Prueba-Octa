"use client";
// components/editors/ScheduleEditor.tsx
// Componente reutilizable para editar horarios por día.
// Usado en CalendarPanel (horario general) y en cada miembro del equipo.

import { Trash2 } from "lucide-react";

const DAYS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

interface ScheduleEditorProps {
  schedule: Record<string, any>;
  onChange: (newSchedule: Record<string, any>) => void;
}

export default function ScheduleEditor({ schedule, onChange }: ScheduleEditorProps) {
  const update = (dayKey: string, updates: any) => {
    const day = schedule?.[dayKey] || { isOpen: false, ranges: [{ start: "09:00", end: "18:00" }] };
    onChange({ ...schedule, [dayKey]: { ...day, ...updates } });
  };

  return (
    <div className="space-y-2">
      {DAYS.map((dayName, index) => {
        const k   = String(index);
        const day = schedule?.[k] || { isOpen: false, ranges: [{ start: "09:00", end: "18:00" }] };
        return (
          <div key={k} className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-200 text-xs">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <button
                  onClick={() => update(k, { isOpen: !day.isOpen })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${day.isOpen ? "bg-[#577a2c]" : "bg-zinc-300"}`}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${day.isOpen ? "translate-x-5" : "translate-x-1"}`} />
                </button>
                <span className={day.isOpen ? "font-bold text-zinc-800" : "text-zinc-400"}>{dayName}</span>
              </label>
              {day.isOpen && (day.ranges?.length || 0) < 2 && (
                <button
                  onClick={() => update(k, { ranges: [...(day.ranges || []), { start: "16:00", end: "20:00" }] })}
                  className="text-[10px] text-[#577a2c] hover:bg-[#577a2c]/10 px-2 py-0.5 rounded border border-[#577a2c]/20 font-bold">
                  + turno
                </button>
              )}
            </div>
            {day.isOpen ? (
              <div className="space-y-1.5 pl-8">
                {day.ranges?.map((range: any, ri: number) => (
                  <div key={ri} className="flex items-center gap-1">
                    <input type="time" value={range.start}
                      onChange={e => {
                        const r = [...day.ranges];
                        r[ri] = { ...r[ri], start: e.target.value };
                        update(k, { ranges: r });
                      }}
                      className="p-1 border border-zinc-300 rounded w-full bg-white outline-none focus:ring-1 focus:ring-[#577a2c]" />
                    <span className="text-zinc-400 font-bold shrink-0">–</span>
                    <input type="time" value={range.end}
                      onChange={e => {
                        const r = [...day.ranges];
                        r[ri] = { ...r[ri], end: e.target.value };
                        update(k, { ranges: r });
                      }}
                      className="p-1 border border-zinc-300 rounded w-full bg-white outline-none focus:ring-1 focus:ring-[#577a2c]" />
                    {day.ranges.length > 1 && (
                      <button onClick={() => update(k, { ranges: day.ranges.filter((_: any, i: number) => i !== ri) })}
                        className="text-zinc-400 hover:text-red-500 p-0.5 shrink-0">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="pl-8 text-zinc-400 italic text-[10px] uppercase tracking-wide">Cerrado</p>
            )}
          </div>
        );
      })}
    </div>
  );
}