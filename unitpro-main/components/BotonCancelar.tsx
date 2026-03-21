"use client"; 

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react"; 

// IMPORTANTE: Aquí corregimos la ruta roja. 
// Asumiendo que tu archivo está en app/actions/agendar-turno.ts
import { cancelAppointment } from "@/app/actions/confirm-booking/manage-appointment"; 

export function BotonCancelar({ idTurno, onCancel }: { idTurno: string, onCancel?: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    const confirmacion = window.confirm("¿Cancelar esta cita? Se enviará un email al cliente.");
    if (!confirmacion) return;

    setLoading(true);
    const res = await cancelAppointment(idTurno);
    
    if (!res.success) {
      alert("Error: " + res.error);
      setLoading(false);
    } else {
      if (onCancel) onCancel(); 
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
      title="Cancelar Cita"
    >
      {loading ? (
        <span className="text-xs font-bold">...</span>
      ) : (
        <Trash2 size={18} />
      )}
    </button>
  );
}