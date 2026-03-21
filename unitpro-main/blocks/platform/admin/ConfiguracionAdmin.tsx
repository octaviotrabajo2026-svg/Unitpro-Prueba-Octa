"use client";
// blocks/platform/admin/ConfiguracionAdmin.tsx
import { useState } from "react";
import { Check, CalendarDays, MessageCircle, Mail, Loader2 } from "lucide-react";
import { createClient }       from "@/lib/supabase";
import DomainManager          from "@/components/dashboards/DomainManager";
import { PasswordManager }    from "@/components/dashboards/PasswordManager";
import { updateOwnEmail }     from "@/app/actions/auth/password-actions";
import type { BlockAdminProps } from "@/types/blocks";

const PRIMARY = "#577a2c";

export default function ConfiguracionAdmin({ negocio, sharedData }: BlockAdminProps) {
  const { handleConnectGoogle } = sharedData;
  const supabase = createClient();

  type WaStatus = "disconnected" | "loading_qr" | "waiting_scan" | "connected";
  const [waStatus, setWaStatus]   = useState<WaStatus>(negocio?.whatsapp_access_token ? "connected" : "disconnected");
  const [qrUrl, setQrUrl]         = useState<string | null>(null);
  const [instance, setInstance]   = useState<string | null>(null);

  const [emailStep, setEmailStep]       = useState<'form' | 'success'>('form');
  const [newEmail, setNewEmail]         = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError]     = useState('');

  const generateQR = async () => {
    setWaStatus("loading_qr");
    try {
      const res  = await fetch("/api/Whatsapp/generar-qr", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ negocioId: negocio.id }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setQrUrl(data.qrCodeBase64);
      setWaStatus("waiting_scan");
      setInstance(data.instanceName);
    } catch (e: any) {
      alert("Error WhatsApp: " + e.message);
      setWaStatus("disconnected");
    }
  };

  const linkWA = async (inst: string) => {
    await supabase.from("negocios").update({ whatsapp_access_token: inst }).eq("id", negocio.id);
    setWaStatus("connected"); setQrUrl(null); window.location.reload();
  };

  const unlinkGoogle = async () => {
    if (!confirm("¿Desconectar Google Calendar?")) return;
    await supabase.from("negocios").update({
      google_calendar_connected: false, google_access_token: null, google_refresh_token: null,
    }).eq("id", negocio.id);
    window.location.reload();
  };

  const unlinkWA = async () => {
    if (!confirm("¿Desconectar WhatsApp?")) return;
    await supabase.from("negocios").update({ whatsapp_access_token: null }).eq("id", negocio.id);
    window.location.reload();
  };

  const waLabel = { disconnected: "Generar QR", loading_qr: "Generando...", waiting_scan: "Esperando...", connected: "Conectado" }[waStatus];

  return (
    <div className="animate-in fade-in space-y-8">
      <header><h1 className="text-2xl font-bold">Configuración</h1></header>

      {/* Dominio y SEO */}
      <section className="bg-white rounded-2xl border border-zinc-200 p-6">
        <h2 className="text-lg font-bold mb-4">Dominio y SEO</h2>
        <DomainManager
          negocioId={negocio.id}
          initialDomain={negocio.custom_domain}
          initialTitle={negocio.config_web?.metadata?.title || ""}
          initialFavicon={negocio.config_web?.metadata?.faviconUrl || ""}
        />
      </section>

      {/* Integraciones */}
      <section className="bg-white rounded-2xl border border-zinc-200 p-6 space-y-5">
        <h2 className="text-lg font-bold">Integraciones</h2>

        {/* Google Calendar */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <CalendarDays size={20} />
            </div>
            <div>
              <p className="font-bold text-sm">Google Calendar</p>
              {negocio.google_calendar_connected
                ? <p className="text-xs text-green-600 font-bold flex items-center gap-1"><Check size={12} /> Conectado</p>
                : <p className="text-xs text-zinc-400">Desconectado</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <button
              onClick={handleConnectGoogle}
              disabled={negocio.google_calendar_connected}
              className={`px-4 py-2 rounded-lg text-xs font-bold ${negocio.google_calendar_connected ? "bg-zinc-100 text-zinc-400" : "text-white"}`}
              style={negocio.google_calendar_connected ? {} : { backgroundColor: PRIMARY }}>
              {negocio.google_calendar_connected ? "Conectado" : "Conectar"}
            </button>
            {negocio.google_calendar_connected && (
              <button onClick={unlinkGoogle} className="text-[10px] text-red-500 hover:underline">Desconectar</button>
            )}
          </div>
        </div>

        {/* WhatsApp */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: "#25D366" }}>
              <MessageCircle size={20} />
            </div>
            <div>
              <p className="font-bold text-sm">WhatsApp</p>
              {waStatus === "connected"
                ? <p className="text-xs text-green-600 font-bold flex items-center gap-1"><Check size={12} /> Conectado</p>
                : <p className="text-xs text-zinc-400">Desconectado</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <button
              onClick={generateQR}
              disabled={waStatus !== "disconnected"}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: "#25D366" }}>
              {waLabel}
            </button>
            {waStatus === "connected" && (
              <button onClick={unlinkWA} className="text-[10px] text-red-500 hover:underline">Desconectar</button>
            )}
          </div>
        </div>

        {waStatus === "waiting_scan" && qrUrl && (
          <div className="p-6 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col items-center gap-4 animate-in fade-in">
            <p className="text-sm text-zinc-600 text-center">
              Abrí WhatsApp → Dispositivos vinculados → Vincular dispositivo
            </p>
            <img src={qrUrl} alt="QR" className="w-48 h-48 bg-white p-2 rounded-xl border" />
            <button
              onClick={() => instance && linkWA(instance)}
              className="px-6 py-2 text-white font-bold rounded-xl text-sm flex items-center gap-2"
              style={{ backgroundColor: "#25D366" }}>
              <Check size={16} /> Ya lo escaneé
            </button>
          </div>
        )}
      </section>

      {/* Email de acceso */}
      <section className="bg-white rounded-2xl border border-zinc-200 p-6">
        <h2 className="text-lg font-bold mb-1">Email de acceso</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Email actual: <span className="font-mono font-bold text-zinc-700">{negocio.email}</span>
        </p>

        {emailStep === 'success' ? (
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center">
            <p className="text-emerald-800 font-bold text-sm">✅ Email actualizado correctamente.</p>
            <button
              onClick={() => { setEmailStep('form'); setNewEmail(''); setEmailPassword(''); }}
              className="mt-2 text-emerald-700 text-xs hover:underline"
            >
              Volver
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                Nuevo email
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="nuevo@email.com"
                className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-200 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">
                Contraseña actual (para confirmar)
              </label>
              <input
                type="password"
                value={emailPassword}
                onChange={e => setEmailPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-zinc-200 outline-none"
              />
            </div>
            {emailError && <p className="text-xs text-red-500">{emailError}</p>}
            <button
              onClick={async () => {
                setEmailError('');
                setEmailLoading(true);
                const res = await updateOwnEmail(newEmail, emailPassword);
                if (res.success) {
                  setEmailStep('success');
                } else {
                  setEmailError(res.error || 'Error desconocido.');
                }
                setEmailLoading(false);
              }}
              disabled={emailLoading || !newEmail || !emailPassword}
              className="w-full py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {emailLoading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
              Cambiar Email
            </button>
          </div>
        )}
      </section>

      {/* Seguridad */}
      <section className="bg-white rounded-2xl border border-zinc-200 p-6">
        <h2 className="text-lg font-bold mb-4">Cuenta y Seguridad</h2>
        <PasswordManager email={negocio.email} />
      </section>
    </div>
  );
}