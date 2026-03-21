import { useState } from "react";
import { updatePasswordWithOld } from "@/app/actions/auth/password-actions";
import { KeyRound, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

export function PasswordManager({ email }: { email: string }) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpdate = async () => {
    setError("");
    
    // Validaciones básicas de cliente
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las nuevas contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const res = await updatePasswordWithOld(oldPassword, newPassword);
    
    if (res.success) {
      setStep('success');
    } else {
      setError(res.error || "Hubo un error al procesar el cambio.");
    }
    setLoading(false);
  };

  if (step === 'success') {
    return (
      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-center">
        <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={32} />
        <p className="text-emerald-800 font-bold">¡Contraseña actualizada!</p>
        <p className="text-emerald-600 text-sm">Tu clave ha sido cambiada exitosamente.</p>
        <button 
          onClick={() => setStep('form')}
          className="mt-4 text-emerald-700 text-xs font-medium hover:underline"
        >
          Volver a cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      <h3 className="font-bold text-zinc-900 mb-4 flex items-center gap-2">
        <KeyRound size={18} className="text-zinc-400" /> 
        Cambiar Contraseña
      </h3>

      <div className="space-y-4">
        <p className="text-sm text-zinc-500">
          Para actualizar tu clave, primero confirma tu contraseña actual.
        </p>

        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Contraseña Actual</label>
          <input 
            type="password"
            placeholder="••••••••"
            className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl mt-1 focus:ring-2 focus:ring-zinc-200 outline-none transition-all"
            onChange={(e) => setOldPassword(e.target.value)}
            value={oldPassword}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Nueva Contraseña</label>
            <input 
              type="password"
              placeholder="••••••••"
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl mt-1 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              onChange={(e) => setNewPassword(e.target.value)}
              value={newPassword}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Confirmar Nueva</label>
            <input 
              type="password"
              placeholder="••••••••"
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl mt-1 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              onChange={(e) => setConfirmPassword(e.target.value)}
              value={confirmPassword}
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500 ml-1">{error}</p>}

        <button 
          onClick={handleUpdate}
          disabled={loading}
          className="w-full py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ShieldCheck size={16} />
          )}
          Actualizar Contraseña
        </button>
      </div>
    </div>
  );
}