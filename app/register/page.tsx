"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Building2, Store, Mail, Lock, Loader2, ArrowLeft } from "lucide-react";

const GREEN = "#577a2c";

type Mode = "agency" | "business" | null;

export default function RegisterPage() {
  const supabase = createClient();
  const router   = useRouter();

  const [mode, setMode]       = useState<Mode>(null);
  const [loading, setLoading] = useState(false);

  // ── Agency form state ──────────────────────────────────────────────────────
  const [agencyForm, setAgencyForm] = useState({
    nombreAgencia: "",
    email: "",
    password: "",
  });

  // ── Business form state ────────────────────────────────────────────────────
  const [businessForm, setBusinessForm] = useState({
    nombre: "",
    email: "",
    password: "",
  });

  // ── Agency submit ──────────────────────────────────────────────────────────
  const handleAgencyRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: agencyForm.email,
      password: agencyForm.password,
    });

    if (authError) {
      alert("Error de autenticación: " + authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      const slugGenerado = agencyForm.nombreAgencia
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        + "-" + Math.floor(Math.random() * 1000);

      const { error: dbError } = await supabase.from("agencies").insert([{
        user_id:        authData.user.id,
        nombre_agencia: agencyForm.nombreAgencia,
        email:          agencyForm.email,
        slug:           slugGenerado,
        plan:           "trial",
      }]);

      if (!dbError) {
        router.push(`/${slugGenerado}/dashboard`);
        router.refresh();
      } else {
        alert("Error guardando datos de agencia: " + dbError.message);
      }
    }

    setLoading(false);
  };

  // ── Business submit ────────────────────────────────────────────────────────
  const handleBusinessRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // 1. Crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email:    businessForm.email,
      password: businessForm.password,
    });

    if (authError) {
      alert("Error de autenticación: " + authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      alert("No se pudo crear el usuario. Intentá de nuevo.");
      setLoading(false);
      return;
    }

    // 2. Generar slug único
    const slug = businessForm.nombre
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      + "-" + Math.floor(Math.random() * 1000);

    // 3. Insertar negocio
    const { data: negocioData, error: negocioError } = await supabase
      .from("negocios")
      .insert({
        user_id:          authData.user.id,
        email:            businessForm.email,
        nombre:           businessForm.nombre,
        slug,
        system:           "modular",
        agency_id:        null,
        estado_plan:      "activo",
        color_principal:  GREEN,
        config_web: {
          hero: { titulo: businessForm.nombre, mostrar: true },
        },
      })
      .select("id")
      .single();

    if (negocioError || !negocioData) {
      alert("Error guardando datos del negocio: " + (negocioError?.message ?? "sin datos"));
      setLoading(false);
      return;
    }

    // 4. Insertar tenant_block inicial (landing)
    const { error: blockError } = await supabase.from("tenant_blocks").insert({
      negocio_id:   negocioData.id,
      block_id:     "landing",
      active:       true,
      activated_at: new Date().toISOString(),
      config:       {},
    });

    if (blockError) {
      // No bloqueante: el negocio ya fue creado, solo logueamos el error
      console.error("[Register] Error insertando tenant_block:", blockError.message);
    }

    // 5. Redirigir
    router.push(`/${slug}/dashboard`);
    setLoading(false);
  };

  // ── Pantalla de selección ──────────────────────────────────────────────────
  if (mode === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans">
        <div className="w-full max-w-lg">
          <h1 className="text-3xl font-bold text-white text-center mb-2">Bienvenido a UnitPro</h1>
          <p className="text-slate-400 text-center mb-10 text-sm">¿Cómo querés empezar?</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Card Agencia */}
            <button
              onClick={() => setMode("agency")}
              className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border-2 border-transparent hover:border-[#577a2c] group text-left"
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "#eef3e6" }}
              >
                <Building2 size={28} style={{ color: GREEN }} />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg text-center">Soy una Agencia</p>
                <p className="text-slate-500 text-sm mt-1 text-center leading-snug">
                  Gestioná múltiples negocios clientes desde un solo panel
                </p>
              </div>
            </button>

            {/* Card Negocio */}
            <button
              onClick={() => setMode("business")}
              className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 border-2 border-transparent hover:border-[#577a2c] group text-left"
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "#eef3e6" }}
              >
                <Store size={28} style={{ color: GREEN }} />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-lg text-center">Soy un Negocio</p>
                <p className="text-slate-500 text-sm mt-1 text-center leading-snug">
                  Gestioná tu negocio de forma independiente, sin intermediarios
                </p>
              </div>
            </button>
          </div>

          <p className="text-slate-500 text-center text-sm mt-8">
            ¿Ya tenés cuenta?{" "}
            <a href="/login" className="text-white font-semibold hover:underline">
              Iniciar sesión
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── Formulario Agencia ─────────────────────────────────────────────────────
  if (mode === "agency") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <button
            onClick={() => setMode(null)}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-sm font-medium mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Volver
          </button>

          <h1 className="text-2xl font-bold text-slate-900 mb-6 text-center">Crea tu Agencia SaaS</h1>

          <form onSubmit={handleAgencyRegister} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1">Nombre de tu Agencia</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 text-slate-400" size={20} />
                <input
                  required
                  type="text"
                  placeholder="Mi Agencia Digital"
                  onChange={e => setAgencyForm({ ...agencyForm, nombreAgencia: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-slate-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1">Email Admin</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 text-slate-400" size={20} />
                <input
                  required
                  type="email"
                  placeholder="admin@miagencia.com"
                  onChange={e => setAgencyForm({ ...agencyForm, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-slate-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-slate-400" size={20} />
                <input
                  required
                  type="password"
                  placeholder="******"
                  onChange={e => setAgencyForm({ ...agencyForm, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-slate-900 transition-colors"
                />
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 flex justify-center transition-all mt-6 shadow-lg shadow-blue-500/30"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Lanzar Agencia"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Formulario Negocio Autogestionado ──────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <button
          onClick={() => setMode(null)}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 text-sm font-medium mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Volver
        </button>

        <h1 className="text-2xl font-bold text-slate-900 mb-6 text-center">Registrá tu Negocio</h1>

        <form onSubmit={handleBusinessRegister} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 block mb-1">Nombre del Negocio</label>
            <div className="relative">
              <Store className="absolute left-3 top-2.5 text-slate-400" size={20} />
              <input
                required
                type="text"
                placeholder="Mi Negocio"
                onChange={e => setBusinessForm({ ...businessForm, nombre: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-slate-900 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700 block mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 text-slate-400" size={20} />
              <input
                required
                type="email"
                placeholder="contacto@minegocio.com"
                onChange={e => setBusinessForm({ ...businessForm, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-slate-900 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-700 block mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-slate-400" size={20} />
              <input
                required
                type="password"
                placeholder="******"
                onChange={e => setBusinessForm({ ...businessForm, password: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-slate-900 transition-colors"
              />
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full text-white font-bold py-3 rounded-lg flex justify-center transition-all mt-6 shadow-lg hover:opacity-90"
            style={{ backgroundColor: GREEN, boxShadow: "0 4px 14px 0 rgba(87,122,44,0.35)" }}
          >
            {loading ? <Loader2 className="animate-spin" /> : "Crear mi Negocio"}
          </button>
        </form>
      </div>
    </div>
  );
}
