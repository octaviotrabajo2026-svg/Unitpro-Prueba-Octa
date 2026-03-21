"use client";
// blocks/platform/admin/ResumenAdmin.tsx
import { CalendarDays, Calendar, Star } from "lucide-react";
import type { BlockAdminProps } from "@/types/blocks";

export default function ResumenAdmin({ negocio, sharedData }: BlockAdminProps) {
  const { turnos, resenas } = sharedData;
  const promedio = resenas.length > 0
    ? (resenas.reduce((a, r) => a + r.puntuacion, 0) / resenas.length).toFixed(1)
    : "0.0";
  const proximos = turnos.filter(t => new Date(t.fecha_inicio) > new Date()).length;

  return (
    <div className="space-y-8 animate-in fade-in">
      <header>
        <h1 className="text-2xl font-bold tracking-tight mb-1">Buenos días, {negocio.nombre}</h1>
        <p className="text-zinc-500 text-sm">Resumen de actividad y próximos eventos.</p>
      </header>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard title="Total Turnos" value={turnos.length}
          icon={<CalendarDays className="text-[#577a2c]" size={20} />}
          subtext="Todos los registros" />
        <StatCard title="Calificación Global" value={promedio}
          icon={<Star className="text-yellow-500 fill-yellow-400" size={20} />}
          subtext={`Basado en ${resenas.length} reseñas`} />
        <StatCard title="Próximos Turnos" value={proximos}
          icon={<Calendar className="text-purple-600" size={20} />}
          subtext="Desde ahora en adelante" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, subtext }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col justify-between h-full">
      <div className="p-2 bg-zinc-50 rounded-lg border border-zinc-100 w-fit mb-4">{icon}</div>
      <div>
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
        <h3 className="text-3xl font-extrabold text-zinc-900 tracking-tight">{value}</h3>
        {subtext && <p className="text-zinc-400 text-xs mt-2">{subtext}</p>}
      </div>
    </div>
  );
}
