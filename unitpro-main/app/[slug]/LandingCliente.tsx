"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";


// Importamos dinámicamente para que el código de "Citas" no se cargue si el usuario está en un "Restaurante"
// Esto mejora el rendimiento brutalmente.
const ServiceBookingLanding = dynamic(() => import("@/components/landings/ServiceBookingLanding"), {
  loading: () => <LoadingScreen />,
});

const ProjectLanding = dynamic(() => import("@/components/landings/ProjectLanding"), {
  loading: () => <LoadingScreen />,
});

const ConfirmBookingLanding = dynamic(() => import("@/components/landings/ConfirmBookingLanding"), {
  loading: () => <LoadingScreen />,
});

// Futuro: const RestaurantLanding = dynamic(() => import("@/components/landings/RestaurantLanding"));

export default function LandingFactory({ initialData }: { initialData: any }) {
  const category = initialData.category || 'service_booking'; // Fallback por seguridad

  // STRATEGY PATTERN:
  // Cada "Case" carga un componente que ya sabe qué acciones backend usar.
  switch (category) {
    case 'service_booking':
      return <ServiceBookingLanding initialData={initialData} />;
    
    case 'project_portfolio':
      return <ProjectLanding initialData={initialData} />;
      
    case 'confirm_booking':
      return <ConfirmBookingLanding initialData={initialData} />;

    default:
      return <div className="p-10 text-center">Error: Categoría de negocio no reconocida.</div>;
  }
}

// Componente de carga simple
function LoadingScreen() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-slate-400" size={32} />
    </div>
  );
}