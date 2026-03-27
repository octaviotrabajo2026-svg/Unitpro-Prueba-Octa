"use client";
// app/superadmin/page.tsx

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, LogOut, Loader2, Users, Building2,
  Coins, Settings, RefreshCw, Check, AlertCircle,
  Eye, EyeOff, TrendingUp, Calendar, CreditCard,
  ToggleLeft, ToggleRight, User,
} from "lucide-react";

const PRIMARY = "#577a2c";
const BG      = "#eee9dd";

function UCoin({ amount, size = "sm" }: { amount: number; size?: "sm" | "lg" }) {
  const coin = size === "lg" ? "w-7 h-7 text-[11px]" : "w-5 h-5 text-[9px]";
  const text = size === "lg" ? "text-xl font-black" : "text-sm font-bold";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${coin} rounded-full bg-[#577a2c] text-white font-black flex items-center justify-center shrink-0 shadow-sm`}>UC</span>
      <span className={text}>{amount}</span>
    </span>
  );
}

const EDITABLE_BLOCKS = [
  { id: "calendar",  name: "Turnos & Calendario", defaultUC: 25 },
  { id: "crm",       name: "Clientes",            defaultUC: 15 },
  { id: "reviews",   name: "Valoraciones",        defaultUC: 7  },
  { id: "gallery",   name: "Galería",             defaultUC: 8  },
  { id: "analytics", name: "Analytics",           defaultUC: 15 },
  { id: "marketing", name: "Marketing",           defaultUC: 10 },
];

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [user,     setUser]     = useState("");
  const [pass,     setPass]     = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res  = await fetch("/api/superadmin/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user, password: pass }),
      });
      const data = await res.json();
      if (data.success) { onLogin(); }
      else { setError(data.error || "Credenciales inválidas."); }
    } catch { setError("Error de conexión."); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-xl" style={{ backgroundColor: PRIMARY }}>
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-zinc-900">UnitPro</h1>
          <p className="text-sm text-zinc-500 mt-1">Panel de Operaciones</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl border border-zinc-200 p-8 space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase mb-1.5 block">Usuario</label>
            <input type="text" required autoComplete="username" value={user} onChange={e => setUser(e.target.value)}
              className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900"
              placeholder="superadmin" />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase mb-1.5 block">Contraseña</label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} required autoComplete="current-password"
                value={pass} onChange={e => setPass(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-zinc-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-zinc-900"
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60 mt-2"
            style={{ backgroundColor: PRIMARY }}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Verificando...</> : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
type Tab = "agencias" | "configuracion" | "billing";

interface Agency {
  id: number; name: string; nombre_agencia: string;
  email: string; slug: string; created_at: string; client_count: number;
}
interface SelfManagedNegocio {
  id: number; nombre: string; slug: string; email: string;
  created_at: string; estado_plan: string;
}
interface BillingEnforced { negocio_ids: number[]; agency_ids: number[] }
interface PlatformConfig  { unitcoin_rate?: number; block_prices?: Record<string, number> }

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab,           setTab]           = useState<Tab>("agencias");
  const [agencies,      setAgencies]      = useState<Agency[]>([]);
  const [selfManaged,   setSelfManaged]   = useState<SelfManagedNegocio[]>([]);
  const [config,        setConfig]        = useState<PlatformConfig>({});
  const [billing,       setBilling]       = useState<BillingEnforced>({ negocio_ids: [], agency_ids: [] });
  const [totals,        setTotals]        = useState({ agencies: 0, clients: 0 });
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [ucRate,        setUcRate]        = useState<number>(100);
  const [blockPrices,   setBlockPrices]   = useState<Record<string, number>>({});
  const [saving,        setSaving]        = useState<string | null>(null);
  const [savedKey,      setSavedKey]      = useState<string | null>(null);
  const [togglingId,    setTogglingId]    = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch("/api/superadmin/data");
      if (res.status === 401) { onLogout(); return; }
      const data = await res.json();
      setAgencies(data.agencies   || []);
      setSelfManaged(data.selfManaged || []);
      setTotals({ agencies: data.totalAgencies, clients: data.totalClients });
      const cfg: PlatformConfig = data.platformConfig || {};
      setConfig(cfg);
      setUcRate(Number(cfg.unitcoin_rate) || 100);
      setBlockPrices(cfg.block_prices || Object.fromEntries(EDITABLE_BLOCKS.map(b => [b.id, b.defaultUC])));
      setBilling(data.billingEnforced || { negocio_ids: [], agency_ids: [] });
    } catch { setError("No se pudo cargar la información."); }
    setLoading(false);
  }, [onLogout]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveConfig = async (key: string, value: any) => {
    setSaving(key);
    try {
      const res = await fetch("/api/superadmin/config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) { setSavedKey(key); setTimeout(() => setSavedKey(null), 2000); }
    } catch {}
    setSaving(null);
  };

  // ── Toggles de billing ────────────────────────────────────────────────────
  const toggleAgencyBilling = async (agencyId: number) => {
    const key = `agency_${agencyId}`;
    setTogglingId(key);
    const current = billing.agency_ids.includes(agencyId);
    const updated: BillingEnforced = {
      ...billing,
      agency_ids: current
        ? billing.agency_ids.filter(id => id !== agencyId)
        : [...billing.agency_ids, agencyId],
    };
    await saveConfig("billing_enforced", updated);
    setBilling(updated);
    setTogglingId(null);
  };

  const toggleNegocioBilling = async (negocioId: number) => {
    const key = `negocio_${negocioId}`;
    setTogglingId(key);
    const current = billing.negocio_ids.includes(negocioId);
    const updated: BillingEnforced = {
      ...billing,
      negocio_ids: current
        ? billing.negocio_ids.filter(id => id !== negocioId)
        : [...billing.negocio_ids, negocioId],
    };
    await saveConfig("billing_enforced", updated);
    setBilling(updated);
    setTogglingId(null);
  };

  const handleLogout = async () => {
    await fetch("/api/superadmin/auth", { method: "DELETE" });
    onLogout();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: BG }}>
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow" style={{ backgroundColor: PRIMARY }}>UP</div>
          <div>
            <h1 className="font-black text-zinc-900 text-lg leading-tight">UnitPro Ops</h1>
            <p className="text-xs text-zinc-400">Panel de operaciones</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors font-medium">
          <LogOut size={15} /> Salir
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Agencias", value: totals.agencies,        icon: <Building2 size={18} style={{ color: PRIMARY }} /> },
            { label: "Clientes", value: totals.clients,         icon: <Users size={18} className="text-blue-500" /> },
            { label: "UnitCoin", value: `1 UC = $${ucRate}`,    icon: <Coins size={18} className="text-amber-500" /> },
            { label: "Billing",  value: `${billing.agency_ids.length + billing.negocio_ids.length} activos`,
              icon: <CreditCard size={18} className="text-emerald-500" /> },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-3">{s.icon}<span className="text-xs font-bold text-zinc-400 uppercase">{s.label}</span></div>
              <p className="text-xl font-black text-zinc-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-200/60 p-1 rounded-xl w-fit flex-wrap">
          {([
            { id: "agencias",      label: "Agencias",            icon: <Building2 size={14} /> },
            { id: "billing",       label: "Billing",             icon: <CreditCard size={14} /> },
            { id: "configuracion", label: "UnitCoin & Precios",  icon: <Coins size={14} /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                tab === t.id ? "bg-white shadow text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-zinc-400" size={32} /></div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-20 text-zinc-400">
            <AlertCircle size={32} />
            <p className="text-sm">{error}</p>
            <button onClick={loadData} className="flex items-center gap-2 text-sm font-bold text-[#577a2c] hover:underline">
              <RefreshCw size={14} /> Reintentar
            </button>
          </div>
        ) : (
          <>
            {/* ── TAB AGENCIAS ────────────────────────────────────────────── */}
            {tab === "agencias" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-zinc-900">Agencias registradas</h2>
                  <button onClick={loadData}
                    className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 px-3 py-1.5 hover:bg-white rounded-lg border border-transparent hover:border-zinc-200 transition-all">
                    <RefreshCw size={12} /> Actualizar
                  </button>
                </div>
                {agencies.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-dashed border-zinc-200 p-12 text-center text-zinc-400">
                    <Building2 size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No hay agencias registradas aún.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-zinc-50 border-b border-zinc-100 text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                      <div className="col-span-4">Agencia</div>
                      <div className="col-span-4">Email</div>
                      <div className="col-span-2 text-center">Clientes</div>
                      <div className="col-span-2 text-right">Registro</div>
                    </div>
                    {agencies.map((ag, i) => (
                      <div key={ag.id}
                        className={`grid grid-cols-12 gap-4 px-6 py-4 items-center ${i < agencies.length - 1 ? "border-b border-zinc-100" : ""} hover:bg-zinc-50/50 transition-colors`}>
                        <div className="col-span-4 flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-sm" style={{ backgroundColor: PRIMARY }}>
                            {(ag.name || ag.nombre_agencia || "?")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-zinc-900 text-sm truncate">{ag.name || ag.nombre_agencia || "—"}</p>
                            <p className="text-xs text-zinc-400 font-mono truncate">{ag.slug}</p>
                          </div>
                        </div>
                        <div className="col-span-4 min-w-0">
                          <p className="text-sm text-zinc-600 truncate">{ag.email}</p>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#577a2c]/10 text-[#577a2c]">
                            <Users size={10} /> {ag.client_count}
                          </span>
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="flex items-center justify-end gap-1 text-xs text-zinc-400">
                            <Calendar size={10} /> {formatDate(ag.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB BILLING ─────────────────────────────────────────────── */}
            {tab === "billing" && (
              <div className="space-y-6">
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                  <strong>¿Cómo funciona?</strong> Por defecto todos los negocios y agencias tienen
                  los bloques gratuitos. Activá el billing para que ese cliente empiece a consumir
                  UnitCoins al activar bloques.
                </div>

                {/* Billing por agencia */}
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
                      <Building2 size={20} className="text-blue-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900">Agencias</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Activar el billing de una agencia aplica a todos sus negocios.
                      </p>
                    </div>
                  </div>
                  {agencies.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-4">No hay agencias registradas.</p>
                  ) : (
                    <div className="space-y-2">
                      {agencies.map(ag => {
                        const enforced = billing.agency_ids.includes(ag.id);
                        const key = `agency_${ag.id}`;
                        return (
                          <div key={ag.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-xs shrink-0" style={{ backgroundColor: PRIMARY }}>
                                {(ag.name || ag.nombre_agencia || "?")[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-zinc-900 truncate">{ag.name || ag.nombre_agencia}</p>
                                <p className="text-xs text-zinc-400">{ag.client_count} negocios</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                enforced ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"
                              }`}>
                                {enforced ? "Pago real" : "Libre"}
                              </span>
                              <button
                                onClick={() => toggleAgencyBilling(ag.id)}
                                disabled={togglingId === key}
                                className="relative"
                              >
                                {togglingId === key
                                  ? <Loader2 size={20} className="animate-spin text-zinc-400" />
                                  : enforced
                                  ? <ToggleRight size={28} style={{ color: PRIMARY }} />
                                  : <ToggleLeft size={28} className="text-zinc-300" />
                                }
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Billing por negocio autogestionado */}
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center">
                      <User size={20} className="text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900">Negocios autogestionados</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Clientes directos de UnitPro sin agencia.
                      </p>
                    </div>
                  </div>
                  {selfManaged.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-4">No hay negocios autogestionados.</p>
                  ) : (
                    <div className="space-y-2">
                      {selfManaged.map(neg => {
                        const enforced = billing.negocio_ids.includes(neg.id);
                        const key = `negocio_${neg.id}`;
                        return (
                          <div key={neg.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-zinc-200 flex items-center justify-center text-zinc-600 font-black text-xs shrink-0">
                                {neg.nombre?.[0]?.toUpperCase() ?? "N"}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-zinc-900 truncate">{neg.nombre}</p>
                                <p className="text-xs text-zinc-400 font-mono">{neg.slug}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                                enforced ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-500"
                              }`}>
                                {enforced ? "Pago real" : "Libre"}
                              </span>
                              <button
                                onClick={() => toggleNegocioBilling(neg.id)}
                                disabled={togglingId === key}
                              >
                                {togglingId === key
                                  ? <Loader2 size={20} className="animate-spin text-zinc-400" />
                                  : enforced
                                  ? <ToggleRight size={28} style={{ color: PRIMARY }} />
                                  : <ToggleLeft size={28} className="text-zinc-300" />
                                }
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB CONFIGURACIÓN ───────────────────────────────────────── */}
            {tab === "configuracion" && (
              <div className="space-y-6">
                {/* Tasa de cambio UnitCoin */}
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center">
                      <Coins size={20} className="text-amber-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900">Valor del UnitCoin</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Cuántos pesos argentinos vale 1 UC.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">$</span>
                      <input type="number" min={1} value={ucRate} onChange={e => setUcRate(Number(e.target.value))}
                        className="w-full pl-9 pr-4 py-3 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-[#577a2c]/30" />
                    </div>
                    <span className="text-zinc-400 text-sm font-medium">ARS por 1 UC</span>
                    <button onClick={() => saveConfig("unitcoin_rate", ucRate)} disabled={saving === "unitcoin_rate"}
                      className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-60"
                      style={{ backgroundColor: PRIMARY }}>
                      {saving === "unitcoin_rate" ? <Loader2 size={14} className="animate-spin" />
                        : savedKey === "unitcoin_rate" ? <><Check size={14} /> Guardado</> : "Guardar"}
                    </button>
                  </div>
                  <div className="mt-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-xs font-bold text-zinc-400 uppercase mb-2">Equivalencias actuales</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[10, 25, 50].map(uc => (
                        <div key={uc} className="text-center">
                          <UCoin amount={uc} />
                          <p className="text-xs text-zinc-400 mt-1">= ${(uc * ucRate).toLocaleString("es-AR")} ARS</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Precios de bloques */}
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[#577a2c]/10 border border-[#577a2c]/20 flex items-center justify-center">
                      <Settings size={20} style={{ color: PRIMARY }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900">Precios de Bloques</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">Precio mensual de cada bloque en UnitCoins.</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {EDITABLE_BLOCKS.map(block => {
                      const currentUC  = blockPrices[block.id] ?? block.defaultUC;
                      const currentARS = currentUC * ucRate;
                      const saveKey    = `block_${block.id}`;
                      return (
                        <div key={block.id} className="flex items-center gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-100">
                          <div className="flex-1">
                            <p className="font-bold text-sm text-zinc-900">{block.name}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">≈ ${currentARS.toLocaleString("es-AR")} ARS/mes</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-[#577a2c] text-white text-[8px] font-black flex items-center justify-center">UC</div>
                            <input type="number" min={0} value={currentUC}
                              onChange={e => setBlockPrices(prev => ({ ...prev, [block.id]: Number(e.target.value) }))}
                              className="w-20 px-3 py-2 border border-zinc-200 rounded-lg text-sm font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-[#577a2c]/30 text-center bg-white" />
                          </div>
                          <button
                            onClick={() => saveConfig("block_prices", { ...blockPrices, [block.id]: currentUC })}
                            disabled={saving === saveKey}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                              savedKey === saveKey ? "bg-green-50 text-green-700 border border-green-200" : "text-white hover:opacity-90"
                            }`}
                            style={savedKey !== saveKey ? { backgroundColor: PRIMARY } : {}}>
                            {saving === saveKey ? <Loader2 size={12} className="animate-spin" />
                              : savedKey === saveKey ? <Check size={12} /> : "Guardar"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-4 text-center">
                    Los precios se aplican solo a los negocios/agencias con billing activo.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function SuperadminPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/superadmin/data")
      .then(r => setAuthenticated(r.ok))
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: BG }}>
        <Loader2 className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  return authenticated
    ? <Dashboard onLogout={() => setAuthenticated(false)} />
    : <LoginScreen onLogin={() => setAuthenticated(true)} />;
}