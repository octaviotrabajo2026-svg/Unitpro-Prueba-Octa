"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import Link from 'next/link'
import Image from 'next/image';
import { League_Spartan } from 'next/font/google'; // Importando la fuente

// Configuración de la fuente igual que en la home
const leagueSpartan = League_Spartan({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'] 
});

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Validamos contraseña con Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !data.user || !data.user.email) {
      setError("Email o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    const userEmail = data.user.email;

    // 2. Buscamos en NEGOCIOS usando ilike (sin importar mayúsculas) y limit(1)
    const { data: negocios } = await supabase
      .from("negocios")
      .select("slug")
      .eq("user_id", data.user.id)  
      .limit(1);

    if (negocios && negocios.length > 0) {
      const negocio = negocios[0];
      router.push(`/${negocio.slug}/dashboard`);
      router.refresh(); // Mejor ejecutarlo después o removerlo si no es estrictamente necesario
      return;
    }

    // 3. Buscamos en AGENCIAS 
    const { data: agencias } = await supabase
      .from("agencies")
      .select("slug")
      .eq("user_id", data.user.id)
      .limit(1);

    if (agencias && agencias.length > 0) {
      const agencia = agencias[0];
      router.push(`/${agencia.slug}/dashboard`);
      router.refresh(); 
      return;
    }

    // 4. Si el mail no aparece
    await supabase.auth.signOut();
    setError(`El email ${userEmail} no tiene ningún negocio asignado en la base de datos.`);
    setLoading(false);
  };

  return (
   <div className={`min-h-screen flex items-center justify-center bg-[#eee9dd] p-4 ${leagueSpartan.className} selection:bg-[#c9efa3]`}>
         <div className="bg-white/60 backdrop-blur-md p-10 rounded-[2.5rem] shadow-xl w-full max-w-md border border-neutral-300/50">
           <div className="text-center mb-10">
             <div className="flex items-center justify-center gap-2 font-bold text-3xl tracking-tighter mb-4 text-neutral-900">
                <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
                  <Image 
                    src="/logo.png" 
                    alt="UnitPro Logo"
                    width={48} // Aumentado a 48 para ocupar todo el contenedor (w-12)
                    height={48}
                    className="object-contain"
                  />
                </div>
                UnitPro
              </div>
             <p className="text-neutral-600 font-medium mt-1">Accede a tu panel de gestión</p>
           </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5 ml-1 uppercase tracking-wider">Email</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-5 py-3 bg-[#eee9dd]/30 border border-neutral-300 rounded-2xl outline-none focus:border-[#4c6618] text-neutral-900 transition-all font-medium"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-neutral-700 mb-1.5 ml-1 uppercase tracking-wider">Contraseña</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-5 py-3 bg-[#eee9dd]/30 border border-neutral-300 rounded-2xl outline-none focus:border-[#4c6618] text-neutral-900 transition-all font-medium"
            />
          </div>
          
          {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-2xl border border-red-100 flex items-start gap-3">
                <AlertCircle size={18} className="shrink-0 mt-0.5"/>
                <span className="font-medium">{error}</span>
            </div>
          )}
          <div className="flex justify-end">
            <Link href="/recover-password" className="text-sm font-bold text-[#4c6618] hover:text-[#3a4e12] transition-colors">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-[#4c6618] text-[#eee9dd] font-bold py-4 rounded-full hover:bg-[#3a4e12] transition-all hover:scale-[1.02] shadow-lg shadow-[#4c6618]/20 flex items-center justify-center gap-2 text-lg tracking-tight"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Ingresar"}
          </button>

          <p className="text-center text-neutral-500 text-sm font-medium mt-6">
              ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-[#4c6618] font-bold hover:underline">
              Empieza gratis
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}