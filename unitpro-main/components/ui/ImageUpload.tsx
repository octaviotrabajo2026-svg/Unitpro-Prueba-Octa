"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Upload, Loader2, Image as ImageIcon, X } from "lucide-react";

interface ImageUploadProps {
  label: string;
  value?: string;
  onChange: (url: string) => void;
  bucket?: string;
}

export function ImageUpload({ label, value, onChange, bucket = "sites" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      // 1. Generar nombre único para evitar colisiones
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 2. Subir a Supabase
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 3. Obtener URL Pública
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // 4. Devolver la URL al padre
      onChange(data.publicUrl);

    } catch (error: any) {
      alert("Error subiendo imagen: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-zinc-400 uppercase block">{label}</label>
      
      <div className="flex items-center gap-4">
        {/* PREVIEW */}
        <div className="relative w-20 h-20 bg-zinc-100 border border-zinc-200 rounded-lg overflow-hidden flex items-center justify-center shrink-0 group">
            {value ? (
                <>
                    <img src={value} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                        onClick={() => onChange("")} // Borrar imagen
                        className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                        <X size={16} />
                    </button>
                </>
            ) : (
                <ImageIcon className="text-zinc-300" size={24} />
            )}
        </div>

        {/* INPUT */}
        <div className="flex-1">
            <label className={`
                flex items-center justify-center gap-2 w-full px-4 py-3 
                border-2 border-dashed border-zinc-300 rounded-xl cursor-pointer
                hover:border-indigo-400 hover:bg-indigo-50 transition-all
                text-sm font-medium text-zinc-500
                ${uploading ? "opacity-50 cursor-not-allowed" : ""}
            `}>
                {uploading ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                {uploading ? "Subiendo..." : "Subir Imagen"}
                <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    disabled={uploading}
                    onChange={handleUpload}
                />
            </label>
        </div>
      </div>
    </div>
  );
}