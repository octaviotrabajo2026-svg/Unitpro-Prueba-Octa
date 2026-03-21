"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

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

export const DashboardAgencia = dynamic(
  () => import("./DashboardAgencia"),
  { ssr: false, loading: () => <LoadingScreen /> }
);

export const DashboardCliente = dynamic(
  () => import("./DashboardCliente"),
  { ssr: false, loading: () => <LoadingScreen /> }
);