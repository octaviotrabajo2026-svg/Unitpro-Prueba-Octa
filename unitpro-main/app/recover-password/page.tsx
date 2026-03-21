'use client'
import { useState } from "react";
import { sendResetPasswordEmail } from "@/app/actions/auth/recover-password";
import { Mail, CheckCircle2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RecoverPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await sendResetPasswordEmail(email);
    if (res.success) {
      setSent(true);
    } else {
      setError("No pudimos enviar el correo. Verifica que el email sea correcto.");
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl border border-zinc-200 text-center shadow-xl">
        <CheckCircle2 className="mx-auto text-emerald-500 mb-4" size={48} />
        <h1 className="text-2xl font-bold text-zinc-900 mb-2">Revisa tu correo</h1>
        <p className="text-zinc-500 mb-6">Hemos enviado un enlace a <strong>{email}</strong> para restablecer tu contraseña.</p>
        <Link href="/login" className="text-sm font-bold text-indigo-600 hover:underline">Volver al login</Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl border border-zinc-200 shadow-xl">
      <Link href="/login" className="flex items-center gap-2 text-zinc-400 hover:text-zinc-600 mb-6 text-sm">
        <ArrowLeft size={16} /> Volver
      </Link>
      <h1 className="text-2xl font-bold text-zinc-900 mb-2">Recuperar cuenta</h1>
      <p className="text-zinc-500 mb-8 text-sm">Ingresa tu email y te enviaremos un link para volver a entrar.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">Email Registrado</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-zinc-400" size={18} />
            <input 
              type="email"
              required
              className="w-full pl-10 p-2.5 bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-xl focus:ring-2 focus:ring-zinc-100 outline-none"
              placeholder="tu@email.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button 
          disabled={loading}
          className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          Enviar Enlace de Recuperación
        </button>
      </form>
    </div>
  );
}