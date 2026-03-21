"use client";
// blocks/reviews/admin/ReviewsAdmin.tsx
import { Star, MessageCircle, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { BlockAdminProps } from "@/types/blocks";

const PRIMARY = "#577a2c";

export default function ReviewsAdmin({ negocio, sharedData }: BlockAdminProps) {
  const { resenas, setResenas } = sharedData;
  const supabase = createClient();

  const toggle = async (id: string, current: boolean) => {
    const { error } = await supabase.from("resenas").update({ visible: !current }).eq("id", id).eq("negocio_id", negocio.id);
    if (!error) setResenas(prev => prev.map(r => r.id === id ? { ...r, visible: !current } : r));
    else alert("Error: " + error.message);
  };

  return (
    <div className="animate-in fade-in">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star className="text-yellow-400 fill-yellow-400" /> Reseñas ({resenas.length})
        </h1>
        <p className="text-zinc-500 text-sm">Opiniones recibidas desde tu Landing Page.</p>
      </header>

      {resenas.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
          <MessageCircle size={40} className="mx-auto text-zinc-200 mb-3" />
          <h3 className="text-lg font-bold text-zinc-900">Sin reseñas aún</h3>
          <p className="text-zinc-500 text-sm mt-1">Compartí el link de tu landing con tus clientes.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {resenas.map((r: any) => (
            <div key={r.id}
              className="relative bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all">
              <button onClick={() => toggle(r.id, r.visible)}
                className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:bg-zinc-100 transition-colors"
                title={r.visible ? "Ocultar reseña" : "Mostrar reseña"}>
                {r.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <div className="flex justify-between items-start mb-3 pr-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm"
                    style={{ backgroundColor: PRIMARY }}>
                    {r.nombre_cliente?.charAt(0) || "?"}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{r.nombre_cliente || "Anónimo"}</p>
                    <p className="text-[11px] text-zinc-400">
                      {new Date(r.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-0.5 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={12} className={i < r.puntuacion ? "text-yellow-400 fill-yellow-400" : "text-zinc-200"} />
                  ))}
                </div>
              </div>
              {r.comentario && (
                <p className="text-sm text-zinc-600 italic">"{r.comentario}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}