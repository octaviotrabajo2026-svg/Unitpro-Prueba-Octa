"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import ConfirmBookingEditor from "@/components/editors/ConfirmBookingEditor";
import ServiceBookingEditor from "@/components/editors/ServiceBookingEditor";
import ProjectEditor        from "@/components/editors/ProjectEditor";
import ModularEditor        from "@/components/editors/ModularEditor";

import ConfirmBookingLanding from "@/components/landings/ConfirmBookingLanding";
import ServiceBookingLanding from "@/components/landings/ServiceBookingLanding";
import ProjectLanding        from "@/components/landings/ProjectLanding";

import DomainManager from "@/components/dashboards/DomainManager";

interface WebEditorProps {
  initialData: any;
  model: "negocio" | "agencia";
  onClose: () => void;
  onSave:  () => void;
}

export default function WebEditor({ initialData, model, onClose, onSave }: WebEditorProps) {
  if (!initialData) return null;

  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<"editor" | "domain">("editor");

  // ── Si es modular, usar el nuevo editor full-screen ───────────────────────
  if (data.system === "modular") {
    return (
      <ModularEditor
        negocio={data}
        onClose={onClose}
        onSaved={onSave}
      />
    );
  }

  // ── Legacy editors ────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 h-screen w-screen bg-gray-50 overflow-hidden font-sans">

      <div className="absolute top-0 left-0 w-1/2 h-16 bg-white z-[60] shadow-xl border-b border-r border-gray-200 rounded-br-2xl flex items-center justify-between px-4 animate-in slide-in-from-left duration-300">
        <div className="p-4 flex items-center gap-3 bg-white">
          <button onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="font-bold text-lg text-gray-800 leading-tight">Editor Web</h2>
            <p className="text-xs text-gray-400 truncate w-40">{data.nombre}</p>
          </div>
        </div>

        <div className="flex border-t border-gray-100">
          <button onClick={() => setActiveTab("editor")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "editor"
                ? "text-blue-600 bg-blue-50/50 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}>
            Diseñar
          </button>
          <button onClick={() => setActiveTab("domain")}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === "domain"
                ? "text-purple-600 bg-purple-50/50 border-b-2 border-purple-600"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}>
            Dominio
          </button>
        </div>
      </div>

      <div className="w-full h-full bg-gray-100 relative">
        {activeTab === "editor" && (
          <div className="w-full h-full bg-white animate-in fade-in duration-300">
            {data.category === "confirm_booking" && (
              <ConfirmBookingEditor negocio={data} onClose={onClose} onSave={onSave} />
            )}
            {data.category === "service_booking" && (
              <ServiceBookingEditor negocio={data} onClose={onClose} onSave={onSave} />
            )}
            {(data.category === "project" || data.category === "project_portfolio") && (
              <ProjectEditor negocio={data} onClose={onClose} onSave={onSave} />
            )}
          </div>
        )}

        {activeTab === "domain" && (
          <div className="w-full h-full p-8 overflow-y-auto bg-slate-100 pt-32">
            <div className="max-w-4xl mx-auto space-y-8 animate-in zoom-in-95 duration-300">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 relative z-10">
                <DomainManager
                  negocioId={data.id}
                  initialDomain={data.custom_domain}
                  initialTitle={data.config_web?.metadata?.title}
                  initialFavicon={data.config_web?.metadata?.faviconUrl}
                  onMetadataUpdate={(newTitle, newFavicon) => {
                    setData((prev: any) => ({
                      ...prev,
                      config_web: {
                        ...prev.config_web,
                        metadata: { ...prev.config_web?.metadata, title: newTitle, faviconUrl: newFavicon },
                      },
                    }));
                  }}
                />
              </div>
              <div className="opacity-40 grayscale pointer-events-none border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white min-h-[500px]">
                <div className="p-4 border-b text-xs font-bold text-gray-400 text-center uppercase">Vista Previa del Sitio</div>
                <Suspense fallback={<div className="p-10 text-center">Cargando...</div>}>
                  {data.category === "confirm_booking" && <ConfirmBookingLanding initialData={data} />}
                  {data.category === "service_booking" && <ServiceBookingLanding initialData={data} />}
                  {(data.category === "project" || data.category === "project_portfolio") && <ProjectLanding initialData={data} />}
                </Suspense>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}