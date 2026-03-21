"use server";

import { createClient } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";

// Constantes de configuración desde variables de entorno
const PROJECT_ID_VERCEL = process.env.PROJECT_ID_VERCEL;
const TEAM_ID_VERCEL = process.env.TEAM_ID_VERCEL;
const AUTH_BEARER_TOKEN = process.env.AUTH_BEARER_TOKEN;

// Helper para construir la URL de la API de Vercel (maneja Teams automáticamente)
const getVercelEndpoint = (path: string) => {
  const baseUrl = `https://api.vercel.com/${path}`;
  return TEAM_ID_VERCEL ? `${baseUrl}?teamId=${TEAM_ID_VERCEL}` : baseUrl;
};

// --- ACTION 1: AÑADIR DOMINIO ---
export async function addDomain(domain: string, negocioId: string) {
  const supabase = await createClient();

  // 1. Limpieza básica del dominio (lowercase, trim)
  const cleanDomain = domain.toLowerCase().trim();

  try {
    // 2. Intentar añadir el dominio a Vercel
    const response = await fetch(getVercelEndpoint(`v10/projects/${PROJECT_ID_VERCEL}/domains`), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AUTH_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: cleanDomain }),
    });

    const data = await response.json();

    if (data.error) {
      // Manejo de errores comunes de Vercel
      if (data.error.code === 'domain_taken') return { error: "El dominio ya está en uso por otra cuenta de Vercel." };
      if (data.error.code === 'forbidden') return { error: "No tienes permisos para añadir este dominio." };
      return { error: data.error.message };
    }

    // 3. Si Vercel acepta, guardamos en Supabase
    const { error: dbError } = await supabase
      .from("negocios")
      .update({ custom_domain: cleanDomain })
      .eq("id", negocioId);

    if (dbError) {
      // Rollback: Si falla la DB, lo borramos de Vercel para no dejar basura
      await fetch(getVercelEndpoint(`v9/projects/${PROJECT_ID_VERCEL}/domains/${cleanDomain}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AUTH_BEARER_TOKEN}` },
      });
      return { error: "Error guardando en base de datos. Intenta nuevamente." };
    }

    revalidatePath("/", "layout"); // Actualiza la UI
    return { success: true, data };

  } catch (error: any) {
    console.error("Error adding domain:", error);
    return { error: "Error de conexión con el servidor." };
  }
}

// --- ACTION 2: ELIMINAR DOMINIO ---
export async function removeDomain(domain: string, negocioId: string) {
  const supabase = await createClient();

  try {
    // 1. Eliminar de Vercel
    const response = await fetch(getVercelEndpoint(`v9/projects/${PROJECT_ID_VERCEL}/domains/${domain}`), {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${AUTH_BEARER_TOKEN}`,
      },
    });

    const data = await response.json();

    if (data.error) {
       return { error: data.error.message };
    }

    // 2. Eliminar de Supabase
    const { error: dbError } = await supabase
      .from("negocios")
      .update({ custom_domain: null }) // Ponemos null
      .eq("id", negocioId);

    if (dbError) return { error: dbError.message };

    revalidatePath("/", "layout");
    return { success: true };

  } catch (error: any) {
    return { error: error.message };
  }
}

// --- ACTION 3: VERIFICAR ESTADO (DNS) ---
// Esta función se llama desde el frontend para ver si el usuario ya configuró los DNS
export async function checkDomainStatus(domain: string) {
  try {
    // a) Verificar configuración del proyecto
    const response = await fetch(getVercelEndpoint(`v9/projects/${PROJECT_ID_VERCEL}/domains/${domain}`), {
      method: "GET",
      headers: { Authorization: `Bearer ${AUTH_BEARER_TOKEN}` },
    });

    const data = await response.json();

    // b) Verificar estado de los registros DNS
    // Vercel nos dice si está "verified", "pending", etc.
    const configResponse = await fetch(getVercelEndpoint(`v6/domains/${domain}/config`), {
        method: "GET",
        headers: { Authorization: `Bearer ${AUTH_BEARER_TOKEN}` },
    });
    
    const configData = await configResponse.json();

    if (data.error || configData.error) {
        return { valid: false, error: "Dominio no encontrado" };
    }

    // Combinamos la info para decirle al usuario qué hacer
    return {
        valid: !data.verified ? false : true,
        status: data.verified ? "Active" : "Pending", // Active = Listo, Pending = Falta DNS
        dnsInfo: !data.verified ? configData : null // Aquí viene qué registros CNAME/A faltan
    };

  } catch (error) {
    return { valid: false, error: "Error verificando dominio" };
  }
}

export async function updateSiteMetadata(negocioId: string, metadata: { title: string, faviconUrl: string }) {
  const supabase = await createClient();

  try {
    // 1. Obtenemos la config actual para no sobrescribir todo
    const { data: negocio, error: fetchError } = await supabase
      .from("negocios")
      .select("config_web")
      .eq("id", negocioId)
      .single();

    if (fetchError) throw new Error("No se pudo obtener el negocio");

    // 2. Fusionamos la metadata nueva con la config existente
    const currentConfig = negocio.config_web || {};
    const updatedConfig = {
      ...currentConfig,
      metadata: {
        ...currentConfig.metadata,
        title: metadata.title,
        faviconUrl: metadata.faviconUrl
      }
    };

    // 3. Guardamos
    const { error: updateError } = await supabase
      .from("negocios")
      .update({ config_web: updatedConfig })
      .eq("id", negocioId);

    if (updateError) throw new Error(updateError.message);

    revalidatePath("/", "layout"); // O la ruta que estés usando
    return { success: true };

  } catch (error: any) {
    return { error: error.message };
  }
}