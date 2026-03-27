"use client";
// blocks/gallery/editor/GalleryPanel.tsx
// Lee imágenes de AMBAS fuentes (legacy customSections + nuevo gallery.images),
// las muestra unificadas, permite borrar de cualquiera y subir nuevas.
//
// CAMBIO: las imágenes se guardan como { url: string; titulo: string }
// en lugar de string[]. Las imágenes antiguas (string) se normalizan en
// runtime para mantener backward compatibility.
//
// FIX delete: botón eliminar usa onPointerDown+stopPropagation para que el
//             div draggable no intercepte el evento y mueva en vez de borrar.
// FIX visibilidad: imágenes guardadas en config_web.gallery.images —
//                  misma fuente que lee GallerySection.

import { useState } from "react";
import { Trash2, Upload, Loader2, GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase";
import type { BlockEditorProps } from "@/types/blocks";

// ── Tipo unificado ────────────────────────────────────────────────────────────
type GalleryImage = { url: string; titulo: string };

// Normaliza cualquier formato (string legacy o objeto nuevo) al tipo unificado
const normalize = (img: any): GalleryImage =>
  typeof img === "string"
    ? { url: img, titulo: "" }
    : { url: img?.url || img, titulo: img?.titulo || "" };

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">
      {children}
    </label>
  );
}

export default function GalleryPanel({ config, updateConfigRoot, negocio }: BlockEditorProps) {
  const supabase = createClient();
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // ── Leer imágenes de ambas fuentes y normalizar ───────────────────────────
  const rawGallery: GalleryImage[] = (
    (config.gallery as any)?.images || []
  ).map(normalize);

  const legacyImages: GalleryImage[] = (
    (negocio?.config_web?.customSections || [])
      .filter((s: any) => s.type === "gallery")
      .flatMap((s: any) =>
        (s.imagenes || [])
          .map((img: any) => normalize(img))
          .filter((img: GalleryImage) => !!img.url)
      )
  );

  const allImages: GalleryImage[] = [
    ...rawGallery,
    ...legacyImages.filter(l => !rawGallery.some(r => r.url === l.url)),
  ];

  // ── Guardar — siempre persiste el array de objetos ────────────────────────
  const saveImages = (newList: GalleryImage[]) => {
    updateConfigRoot("gallery", { ...(config.gallery as any), images: newList });
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const newImgs: GalleryImage[] = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `gallery/${negocio.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("sites").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("sites").getPublicUrl(path);
        newImgs.push({ url: data.publicUrl, titulo: "" });
      }
    }
    saveImages([...allImages, ...newImgs]);
    setUploading(false);
    e.target.value = "";
  };

  // ── Eliminar ──────────────────────────────────────────────────────────────
  const remove = (i: number) => saveImages(allImages.filter((_, idx) => idx !== i));

  // ── Actualizar título de imagen ───────────────────────────────────────────
  const updateTitulo = (i: number, titulo: string) => {
    saveImages(allImages.map((img, idx) => (idx === i ? { ...img, titulo } : img)));
  };

  // ── Drag & drop reorder ───────────────────────────────────────────────────
  const onDragOver = (e: React.DragEvent, target: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === target) return;
    const next = [...allImages];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(target, 0, moved);
    saveImages(next);
    setDragIdx(target);
  };

  return (
    <div className="space-y-6">
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">
            Galería de imágenes ({allImages.length})
          </h3>
        </div>

        {/* Título de la sección */}
        <div>
          <Label>Título de la sección</Label>
          <input
            type="text"
            value={(config.gallery as any)?.titulo ?? "Nuestros Trabajos"}
            onChange={e =>
              updateConfigRoot("gallery", {
                ...(config.gallery as any),
                titulo: e.target.value,
              })
            }
            className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none text-zinc-900"
            placeholder="Nuestros Trabajos"
          />
          <p className="text-[11px] text-zinc-400 mt-1">
            El color del título usa el color de texto de Apariencia.
          </p>
        </div>

        {/* Upload */}
        <label
          className={`w-full py-4 border-2 border-dashed border-zinc-300 rounded-xl flex flex-col items-center gap-2 cursor-pointer transition-all ${
            uploading ? "opacity-60" : "hover:border-[#577a2c] hover:bg-[#577a2c]/5"
          }`}
        >
          {uploading ? (
            <Loader2 size={20} className="text-zinc-400 animate-spin" />
          ) : (
            <Upload size={20} className="text-zinc-400" />
          )}
          <span className="text-sm text-zinc-500 font-medium">
            {uploading ? "Subiendo..." : "Subir imágenes"}
          </span>
          <span className="text-xs text-zinc-400">PNG, JPG, WEBP — múltiples a la vez</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>

        {/* Grid */}
        {allImages.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {allImages.map((img, i) => (
                <div
                  key={img.url + i}
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={e => onDragOver(e, i)}
                  onDragEnd={() => setDragIdx(null)}
                  className={`relative aspect-square rounded-lg overflow-hidden border group cursor-grab active:cursor-grabbing transition-all ${
                    dragIdx === i
                      ? "opacity-50 ring-2 ring-[#577a2c]"
                      : "border-zinc-200 hover:shadow-md"
                  }`}
                >
                  {/* Imagen */}
                  <img src={img.url} alt={img.titulo || ""} className="w-full h-full object-cover" />

                  {/* Overlay hover: botón eliminar */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    {/*
                      FIX: onPointerDown con stopPropagation evita que el div draggable
                      intercepte el evento, lo que causaba que se moviera en lugar de borrarse.
                    */}
                    <button
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); remove(i); }}
                      className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors z-10"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Ícono de drag */}
                  <div className="absolute top-1 left-1 text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <GripVertical size={14} />
                  </div>

                  {/* Input de título — aparece en hover en la parte inferior */}
                  <input
                    type="text"
                    value={img.titulo}
                    onChange={e => updateTitulo(i, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onPointerDown={e => e.stopPropagation()}
                    placeholder="Título (opcional)"
                    className="absolute bottom-0 left-0 right-0 text-[10px] bg-black/70 text-white px-1.5 py-1 outline-none placeholder:text-white/40 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-400 text-center">
              Arrastrá las imágenes para reordenarlas. Pasá el mouse para editar el título.
            </p>
          </>
        ) : (
          <p className="text-center text-zinc-400 text-sm py-4 italic">
            Sin imágenes aún. Subí la primera foto arriba.
          </p>
        )}
      </section>
    </div>
  );
}