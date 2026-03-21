"use client";

import { useState, useEffect } from "react";
import { addDomain, removeDomain, checkDomainStatus, updateSiteMetadata } from "@/app/actions/domain-actions";
import { ImageUpload } from "@/components/ui/ImageUpload";

interface DomainManagerProps {
  negocioId: string;
  initialDomain?: string | null;
  initialTitle?: string;
  initialFavicon?: string;
  onMetadataUpdate?: (title: string, faviconUrl: string) => void;
}

export default function DomainManager({ 
  negocioId, 
  initialDomain, 
  initialTitle = '', 
  initialFavicon = '',
  onMetadataUpdate 
}: DomainManagerProps) {
  const [domain, setDomain] = useState(initialDomain || "");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<{ valid: boolean; status: string } | null>(null);
  const [siteTitle, setSiteTitle] = useState(initialTitle);
  const [favicon, setFavicon] = useState(initialFavicon);
  const [savingMeta, setSavingMeta] = useState(false);

  // Verificar estado automáticamente al cargar si hay un dominio
  useEffect(() => {
    const checkInitialStatus = async () => {
      if (initialDomain) {
        const result = await checkDomainStatus(initialDomain);
        if (!result.error) {
          setStatus({ valid: result.valid, status: result.status || "Pending" });
        }
      }
    };
    checkInitialStatus();
  }, [initialDomain]);

  // 1. Añadir Dominio
  const handleAdd = async () => {
    setLoading(true);
    setError("");
    if (!inputValue.includes(".")) {
        setError("Por favor ingresa un dominio válido (ej: mitienda.com)");
        setLoading(false);
        return;
    }
    const result = await addDomain(inputValue, negocioId);
    if (result.error) {
      setError(result.error);
    } else {
      setDomain(inputValue);
      setInputValue("");
      setStatus({ valid: false, status: "Pending DNS" });
    }
    setLoading(false);
  };

  // 2. Eliminar Dominio
  const handleRemove = async () => {
    if (!confirm("¿Estás seguro? Tu sitio dejará de funcionar en este dominio.")) return;
    setLoading(true);
    const result = await removeDomain(domain, negocioId);
    if (result.error) {
      setError(result.error);
    } else {
      setDomain("");
      setStatus(null);
    }
    setLoading(false);
  };

  // 3. Verificar Estado
  const handleCheckStatus = async () => {
    setLoading(true);
    const result = await checkDomainStatus(domain);
    if (result.error) {
        setError(result.error);
    } else {
        setStatus({ valid: result.valid, status: result.status || "Pending" });
        if (result.valid) alert("¡Dominio activo!");
        else alert("Aún no detectamos la configuración DNS.");
    }
    setLoading(false);
  };

  const handleSaveMetadata = async () => {
    setSavingMeta(true);
    const result = await updateSiteMetadata(negocioId, { 
        title: siteTitle, 
        faviconUrl: favicon 
    });
    if (result.error) {
        alert("Error: " + result.error);
    } else {
        alert("¡Configuración guardada correctamente!");
        // Avisar al componente padre (WebEditor) que la data cambió
        if (onMetadataUpdate) {
            onMetadataUpdate(siteTitle, favicon);
        }
    }
    setSavingMeta(false);
  };

  // --- RENDERIZADO CORREGIDO ---
  // Eliminamos el "early return" para que siempre se renderice la estructura completa
  
  return (
    <div className="space-y-8">
      
      {/* 1. SECCIÓN SEO (SIEMPRE VISIBLE AHORA) */}
      <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Identidad del Sitio (SEO)</h3>
        
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título de la Pestaña
                </label>
                <input
                    type="text"
                    value={siteTitle}
                    onChange={(e) => setSiteTitle(e.target.value)}
                    placeholder="Ej: Mi Negocio - Servicios Profesionales"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Favicon (Icono)
                </label>
                <div className="max-w-xs">
                    <ImageUpload
                        label="Subir Favicon (PNG/ICO)"
                        value={favicon}
                        onChange={(url) => setFavicon(url)}
                        bucket="sites"
                    />
                </div>
            </div>

            <button
                onClick={handleSaveMetadata}
                disabled={savingMeta}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
                {savingMeta ? "Guardando..." : "Guardar Cambios SEO"}
            </button>
        </div>
      </div>

      {/* 2. SECCIÓN DOMINIO (CONDICIONAL INTERNA) */}
      <div className="p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
        
        {!domain ? (
            // A) VISTA: NO HAY DOMINIO
            <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Dominio Personalizado</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Conecta tu propio dominio (ej. <code>tuempresa.com</code>).
                </p>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ej: minegocio.com"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value.toLowerCase())}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <button
                    onClick={handleAdd}
                    disabled={loading || !inputValue}
                    className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
                  >
                    {loading ? "..." : "Conectar"}
                  </button>
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            </>
        ) : (
            // B) VISTA: DOMINIO YA CONECTADO
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Configuración de Dominio</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Conectado a: <a href={`https://${domain}`} target="_blank" className="text-blue-600 font-medium hover:underline">{domain}</a>
                  </p>
                </div>
                
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${status?.valid ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"}`}>
                    {status?.valid ? "Activo SSL ✅" : "Pendiente ⏳"}
                </span>
              </div>

              {!status?.valid && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 text-sm">
                    <p className="font-bold mb-2">Configura tus DNS en tu proveedor:</p>
                    <p className="font-mono mb-1">Tipo A &rarr; 76.76.21.21</p>
                    <p className="font-mono">CNAME www &rarr; cname.vercel-dns.com</p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button onClick={handleCheckStatus} disabled={loading} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
                    {loading ? "Verificando..." : "🔄 Verificar DNS"}
                </button>
                <button onClick={handleRemove} disabled={loading} className="ml-auto px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 text-sm font-medium">
                    Eliminar
                </button>
              </div>
              {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
            </>
        )}
      </div>

    </div>
  );
}