"use client";

// app/[slug]/dashboard/DashboardCliente.tsx
// Factory: detecta system primero, luego category para legacy.

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

// ── Sistema modular (negocios nuevos) ──────────────────────────────────────
const ModularDashboard = dynamic(
  () => import("@/components/dashboards/ModularDashboard"),
  { loading: () => <LoadingScreen /> }
);

// ── Legacy activo ──────────────────────────────────────────────────────────
const ConfirmBookingDashboard = dynamic(
  () => import("@/components/dashboards/ConfirmBookingDashboard"),
  { loading: () => <LoadingScreen /> }
);

// ── Legacy histórico (negocios existentes, no se crean nuevos) ────────────
const ServiceBookingDashboard = dynamic(
  () => import("@/components/dashboards/ServiceBookingDashboard"),
  { loading: () => <LoadingScreen /> }
);
const ProjectDashboard = dynamic(
  () => import("@/components/dashboards/ProjectDashboard"),
  { loading: () => <LoadingScreen /> }
);

export default function DashboardCliente() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [negocio, setNegocio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initDashboard() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email) {
        console.error("Expulsado: No hay usuario de Supabase autenticado.");
        router.push("/login");
        return;
      }

      // 1. Normalizamos el slug exactamente igual que en el servidor (page.tsx)
      const rawSlug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
      const decodedSlug = decodeURIComponent(rawSlug || "").toLowerCase();

      // 2. Buscamos por custom_domain o por slug según corresponda
      const searchColumn = decodedSlug.includes(".") ? "custom_domain" : "slug";

      // CORRECCIÓN AQUÍ: Quitamos 'name' y dejamos solo 'nombre_agencia'
      const { data, error } = await supabase
        .from("negocios")
        .select("*, agencies(nombre_agencia)") 
        .eq(searchColumn, decodedSlug)
        .single();

      // 3. Verificamos si la consulta a la BD falló o devolvió vacío
      if (error || !data) {
        console.error("Expulsado: No se encontró el negocio en la BD.", error);
        router.push("/login");
        return;
      }

      // 4. Comparamos emails ignorando mayúsculas y espacios
      if (data.user_id !== user.id) {
        console.error("Expulsado: El user_id del negocio no coincide con el usuario logueado.", {
          negocioUserId: data.user_id,
          authUserId: user.id,
        });
        router.push("/login");
        return;
      }

      // Todo correcto, guardamos el estado
      setNegocio(data);
      setLoading(false);
    }

    initDashboard();
  }, [params.slug, router, supabase]);

  if (loading) return <LoadingScreen />;
  if (!negocio) return null;

  // ── Sistema modular: tiene prioridad sobre todo lo demás ──────────────────

  if (negocio.estado_plan === "suspendido") {
    const nombreAgencia = negocio.agencies?.name || negocio.agencies?.nombre_agencia || "tu agencia";

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center border-t-4 border-red-500">
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Acceso Suspendido</h2>
          <p className="text-slate-600 mb-6">
            Tu panel de control y tu página web han sido suspendidos temporalmente por falta de pago o irregularidades en la suscripción.
          </p>
          <div className="inline-block bg-slate-50 text-slate-700 font-bold py-3 px-6 rounded-xl border border-slate-200">
            Contactá a <span className="text-red-600">{nombreAgencia}</span> para volver a estar en línea.
          </div>
        </div>
      </div>
    );
  }
  
  if (negocio.system === "modular") {
    return <ModularDashboard initialData={negocio} />;
  }

  // ── Legacy: bifurca por category ──────────────────────────────────────────
  const category = negocio.category || "confirm_booking";

  if (category === "confirm_booking") {
    return <ConfirmBookingDashboard initialData={negocio} />;
  }
  if (category === "service_booking") {
    return <ServiceBookingDashboard initialData={negocio} />;
  }
  if (category === "project_portfolio") {
    return <ProjectDashboard negocio={negocio} />;
  }

  return (
    <div className="p-10 text-center text-red-500">
      Categoría desconocida: {category}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-zinc-900" size={32} />
        <p className="text-zinc-400 text-sm animate-pulse">Iniciando panel...</p>
      </div>
    </div>
  );
}