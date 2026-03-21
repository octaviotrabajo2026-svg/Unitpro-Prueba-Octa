"use client";

import { useState } from "react";
import { Users, Mail, ArrowRight, CheckCircle, AlertCircle, Loader2, Calendar,Image as ImageIcon, X } from "lucide-react";
import { getCampaignAudience } from "@/app/actions/marketing/get-audience";
import { sendCampaignBatch } from "@/app/actions/marketing/send-campaign";
import {ImageUpload} from "@/components/ui/ImageUpload";

export default function MarketingCampaign({ negocio }: { negocio: any }) {
  const [step, setStep] = useState(1); // 1: Filtro, 2: Selección, 3: Redacción, 4: Enviando
  const [loading, setLoading] = useState(false);
  
  // Datos
  const [dateLimit, setDateLimit] = useState("");
  const [audience, setAudience] = useState<any[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  
  
  // Contenido
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Estado de Envío
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ sent: 0, errors: 0 });

  // PASO 1: BUSCAR AUDIENCIA
  const handleSearch = async () => {
    if (!dateLimit) return alert("Selecciona una fecha");
    setLoading(true);
    
    const res = await getCampaignAudience(negocio.id, dateLimit);
    
    if (res.success && res.data) {
      setAudience(res.data);
      // Por defecto seleccionamos todos
      setSelectedEmails(new Set(res.data.map((c: any) => c.cliente_email)));
      setStep(2);
    } else {
      alert("Error buscando clientes: " + res.error);
    }
    setLoading(false);
  };

  // PASO 2: MANEJAR SELECCIÓN (CHECKBOXES)
  const toggleEmail = (email: string) => {
    const newSet = new Set(selectedEmails);
    if (newSet.has(email)) newSet.delete(email);
    else newSet.add(email);
    setSelectedEmails(newSet);
  };

  const toggleAll = () => {
    if (selectedEmails.size === audience.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(audience.map(c => c.cliente_email)));
    }
  };

  // PASO 4: LOGICA DE BATCHING (ENVÍO)
  const startCampaign = async () => {
    if (!confirm(`¿Estás seguro de enviar este correo a ${selectedEmails.size} clientes?`)) return;

    setStep(4);
    setProgress(0);
    setStats({ sent: 0, errors: 0 });

    // Filtramos la audiencia real basada en la selección
    const finalList = audience.filter(c => selectedEmails.has(c.cliente_email));
    
    // Configuración de lotes
    const BATCH_SIZE = 50;
    const total = finalList.length;
    let processed = 0;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = finalList.slice(i, i + BATCH_SIZE).map(c => ({
        email: c.cliente_email,
        nombre: c.cliente_nombre
      }));
      

      // Llamada al Server Action
      const res = await sendCampaignBatch(negocio.id, batch, subject, message, imageUrl);

      if (res.success) {
        setStats(prev => ({
            sent: prev.sent + (res.sentCount || 0),
            errors: prev.errors + (res.errors?.length || 0)
        }));
      } else {
          // Si falla todo el lote
          setStats(prev => ({ ...prev, errors: prev.errors + batch.length }));
      }

      processed += batch.length;
      setProgress(Math.round((processed / total) * 100));
      
      // Pequeña pausa para no saturar al navegador si es muy rápido
      await new Promise(r => setTimeout(r, 500));
    }
  };

  // RENDERIZADO
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <Mail className="text-indigo-600" /> Campañas de Email
        </h1>
        <p className="text-zinc-500">Recupera clientes inactivos enviando promociones segmentadas.</p>
      </header>

      {/* --- PASO 1: FILTRO --- */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={32} />
            </div>
            <h2 className="text-lg font-bold mb-2">Definir Audiencia</h2>
            <p className="text-zinc-500 mb-6">Selecciona una fecha. Buscaremos a todos los clientes cuyo último turno fue <b>antes</b> de ese día.</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="text-left">
                    <label className="text-xs font-bold text-zinc-500 ml-1">Última visita antes de:</label>
                    <input 
                        type="date" 
                        className="block w-full mt-1 p-3 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                        value={dateLimit}
                        onChange={(e) => setDateLimit(e.target.value)}
                    />
                </div>
                <button 
                    onClick={handleSearch}
                    disabled={loading || !dateLimit}
                    className="h-[50px] px-8 bg-indigo-600 text-white font-bold rounded-xl mt-5 hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : "Buscar Clientes"}
                </button>
            </div>
        </div>
      )}

      {/* --- PASO 2: SELECCIÓN --- */}
      {step === 2 && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <h3 className="font-bold">Resultados ({audience.length})</h3>
                <div className="flex gap-2">
                    <button onClick={() => setStep(1)} className="text-zinc-500 text-sm font-medium hover:text-zinc-900 px-3 py-2">Atrás</button>
                    <button 
                        onClick={() => setStep(3)} 
                        disabled={selectedEmails.size === 0}
                        className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-zinc-800 disabled:opacity-50"
                    >
                        Continuar ({selectedEmails.size}) <ArrowRight size={14}/>
                    </button>
                </div>
            </div>

            <div className="overflow-y-auto flex-1 p-4">
                <table className="w-full text-sm text-left">
                    <thead className="text-zinc-500 font-medium border-b border-zinc-100">
                        <tr>
                            <th className="pb-3 w-10">
                                <input type="checkbox" checked={selectedEmails.size === audience.length} onChange={toggleAll} className="rounded border-zinc-300"/>
                            </th>
                            <th className="pb-3">Cliente</th>
                            <th className="pb-3">Email</th>
                            <th className="pb-3">Última Visita</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                        {audience.map((c, i) => (
                            <tr key={i} className={`hover:bg-zinc-50 transition-colors ${!selectedEmails.has(c.cliente_email) && 'opacity-50'}`}>
                                <td className="py-3">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedEmails.has(c.cliente_email)} 
                                        onChange={() => toggleEmail(c.cliente_email)}
                                        className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="py-3 font-medium">{c.cliente_nombre || "Sin Nombre"}</td>
                                <td className="py-3 text-zinc-500 font-mono text-xs">{c.cliente_email}</td>
                                <td className="py-3 text-zinc-500 text-xs">
                                    {new Date(c.fecha_inicio).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      )}

      {/* --- PASO 3: REDACCIÓN --- */}
      {step === 3 && (
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
            <div className="mb-6 flex justify-between items-center">
                <h2 className="text-lg font-bold">Redactar Mensaje</h2>
                <button onClick={() => setStep(2)} className="text-sm text-zinc-500 hover:text-zinc-900">Volver a lista</button>
            </div>
            
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Asunto del Correo</label>
                    <input 
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        placeholder="Ej: ¡Te extrañamos! Acá tenés un regalo 🎁"
                        className="w-full p-3 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-2 flex items-center gap-1">
                        <ImageIcon size={14} /> Imagen de Cabecera (Opcional)
                    </label>
                    
                    {imageUrl ? (
                        <div className="relative w-fit group border border-zinc-200 rounded-xl overflow-hidden">
                            <img src={imageUrl} alt="Preview" className="h-40 object-cover" />
                            <button 
                                onClick={() => setImageUrl("")}
                                className="absolute top-2 right-2 bg-white text-zinc-600 p-1 rounded-full shadow hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <div className="w-full max-w-md">
                            {/* Componente ImageUpload corregido */}
                            <ImageUpload 
                                label="Subir imagen"      // <--- Agregamos el label obligatorio
                                value={imageUrl}          // <--- Pasamos el string directo, no un array
                                onChange={setImageUrl}    // <--- Simplificado
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1">Cuerpo del Mensaje (HTML simple)</label>
                    <div className="text-xs text-zinc-400 mb-2">Tip: Usá <code className="bg-zinc-100 px-1 rounded">{"{{nombre}}"}</code> para que se reemplace por el nombre del cliente.</div>
                    <textarea 
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        rows={8}
                        placeholder="Hola {{nombre}}, hace mucho que no te vemos..."
                        className="w-full p-3 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-sans"
                    />
                </div>
                
                <div className="pt-4 border-t border-zinc-100 flex justify-end">
                    <button 
                        onClick={startCampaign}
                        disabled={!subject || !message}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0"
                    >
                        Enviar a {selectedEmails.size} Clientes
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- PASO 4: PROGRESO --- */}
      {step === 4 && (
        <div className="bg-white p-12 rounded-2xl border border-zinc-200 shadow-sm text-center">
             {progress < 100 ? (
                <>
                    <Loader2 size={48} className="animate-spin text-indigo-600 mx-auto mb-6" />
                    <h2 className="text-2xl font-bold mb-2">Enviando Campaña...</h2>
                    <p className="text-zinc-500 mb-6">Por favor no cierres esta pestaña.</p>
                    
                    <div className="w-full bg-zinc-100 rounded-full h-4 overflow-hidden mb-2">
                        <div className="bg-indigo-600 h-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-xs font-bold text-zinc-400">{progress}% Completado</p>
                </>
             ) : (
                <>
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in">
                        <CheckCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">¡Campaña Finalizada!</h2>
                    <div className="flex justify-center gap-8 my-6">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-emerald-600">{stats.sent}</p>
                            <p className="text-xs text-zinc-400 uppercase font-bold">Enviados</p>
                        </div>
                        {stats.errors > 0 && (
                            <div className="text-center">
                                <p className="text-3xl font-bold text-red-500">{stats.errors}</p>
                                <p className="text-xs text-zinc-400 uppercase font-bold">Fallidos</p>
                            </div>
                        )}
                    </div>
                    <button onClick={() => { setStep(1); setDateLimit(""); setSubject(""); setMessage(""); }} className="text-indigo-600 font-bold hover:underline">
                        Crear nueva campaña
                    </button>
                </>
             )}
        </div>
      )}
    </div>
  );
}