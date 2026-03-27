import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import LandingCliente from "./LandingCliente";
import LandingAgencia from "./LandingAgencia";
import LandingModular from "@/components/LandingModular";
import { Metadata, ResolvingMetadata } from "next";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const supabase = await createClient();
  const { slug } = await params;
  const sp = await searchParams;
  const isPreview = sp?.preview === "1";

  const domainOrSlug = decodeURIComponent(slug).toLowerCase();

  // 1. DOMINIO PERSONALIZADO
  if (domainOrSlug.includes(".")) {
    const { data: negocioDominio } = await supabase
      .from("negocios")
      .select("*")
      .eq("custom_domain", domainOrSlug)
      .single();

    if (negocioDominio) {
      if (negocioDominio.estado_plan === "suspendido") {
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4 text-center">
            <div className="w-16 h-16 mb-4 flex items-center justify-center bg-red-100 text-red-600 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <h1 className="text-2xl font-bold mb-2">Sitio Temporalmente Suspendido</h1>
            <p className="text-slate-500 max-w-md">
              Esta página no se encuentra disponible en este momento. Si eres el administrador del negocio, por favor contáctate con tu agencia para regularizar el servicio.
            </p>
          </div>
        );
      }

      // 🆕 Fase 1: bifurcación por system
      if (negocioDominio.system === 'modular') {
        return <LandingModular negocio={negocioDominio} isPreview={isPreview} />;
      }
      return <LandingCliente initialData={negocioDominio} />;
    }

    return notFound();
  }

  // 2. SLUG INTERNO — Negocios
  const { data: negocioSlug } = await supabase
    .from("negocios")
    .select("*")
    .eq("slug", domainOrSlug)
    .single();

  if (negocioSlug) {
    if (negocioSlug.estado_plan === "suspendido") {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-4 text-center">
          <div className="w-16 h-16 mb-4 flex items-center justify-center bg-red-100 text-red-600 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Sitio Temporalmente Suspendido</h1>
          <p className="text-slate-500 max-w-md">
            Esta página no se encuentra disponible en este momento. Si eres el administrador del negocio, por favor contáctate con tu agencia para regularizar el servicio.
          </p>
        </div>
      );
    }

    // 🆕 Fase 1: bifurcación por system
    if (negocioSlug.system === 'modular') {
      return <LandingModular negocio={negocioSlug} isPreview={isPreview} />;
    }
    return <LandingCliente initialData={negocioSlug} />;
  }

  // 3. SLUG INTERNO — Agencias
  const { data: agencia } = await supabase
    .from("agencies")
    .select("*")
    .eq("slug", domainOrSlug)
    .single();

  if (agencia) {
    return <LandingAgencia initialData={agencia} />;
  }

  return notFound();
}

// ─── generateMetadata (sin cambios) ──────────────────────────────────────────

async function getNegocioData(slug: string) {
  const supabase = await createClient();
  const domainOrSlug = decodeURIComponent(slug).toLowerCase();

  if (domainOrSlug.includes(".")) {
    const { data } = await supabase.from("negocios").select("*").eq("custom_domain", domainOrSlug).single();
    return data;
  }

  const { data } = await supabase.from("negocios").select("*").eq("slug", domainOrSlug).single();
  return data;
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const negocio = await getNegocioData(slug);

  const previousImages = (await parent).openGraph?.images || [];

  if (!negocio) return { title: "No encontrado" };

  const config = negocio.config_web || {};
  const meta = config.metadata || {};

  const siteName = meta.title || config.seo?.title || negocio.nombre || "Create With UnitPro";
  const favicon = meta.faviconUrl || config.seo?.favicon || "/favicon.png";

  return {
    title: siteName,
    description: meta.description || `Bienvenido a ${siteName}`,
    icons: {
      icon: favicon,
      shortcut: favicon,
    },
    openGraph: {
      title: siteName,
      images: [config.hero?.imagenUrl || "", ...previousImages],
    },
  };
}