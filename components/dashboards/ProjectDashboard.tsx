"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { 
  Users, DollarSign, MessageSquare, TrendingUp, 
  Search, Filter, MoreHorizontal, Phone, Mail, 
  CheckCircle, XCircle, Clock, ArrowUpRight 
} from "lucide-react";

// Tipos para los Leads
interface Lead {
  id: string;
  created_at: string;
  nombre_cliente: string;
  email_cliente: string;
  telefono_cliente?: string; // Opcional si agregamos el campo
  mensaje: string;
  estado: 'nuevo' | 'contactado' | 'negociacion' | 'ganado' | 'perdido';
  origen: string;
}

export default function ProjectDashboard({ negocio }: { negocio: any }) {
  const supabase = createClient();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Cargar Leads al inicio
  useEffect(() => {
    fetchLeads();
  }, [negocio.id]);

  const fetchLeads = async () => {
    setLoading(true);
    // Traemos los leads ordenados por fecha (más reciente primero)
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('negocio_id', negocio.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLeads(data as Lead[]);
    }
    setLoading(false);
  };

  // Función para actualizar estado (El corazón del CRM)
  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    // 1. Actualización optimista en UI
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, estado: newStatus as any } : l));
    
    // 2. Actualización en DB
    await supabase.from('leads').update({ estado: newStatus }).eq('id', leadId);
  };

  // Cálculos para KPIs
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.estado === 'nuevo').length;
  const wonLeads = leads.filter(l => l.estado === 'ganado').length;
  // Tasa de conversión simple (Ganados / Totales) * 100
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0";

  // Filtrado visual
  const filteredLeads = filterStatus === 'todos' 
    ? leads 
    : leads.filter(l => l.estado === filterStatus);

  // Helper para colores de estado
  const getStatusColor = (status: string) => {
    switch(status) {
        case 'nuevo': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'contactado': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        case 'negociacion': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'ganado': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'perdido': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* --- HEADER & KPIS --- */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-6">Panel de Control</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard 
                title="Total Prospectos" 
                value={totalLeads} 
                icon={<Users className="text-blue-600" size={20}/>} 
                trend="+12% mes pasado"
            />
            <KpiCard 
                title="Por Contactar" 
                value={newLeads} 
                icon={<MessageSquare className="text-yellow-600" size={20}/>} 
                alert={newLeads > 0} // Rojo si hay pendientes
            />
            <KpiCard 
                title="Proyectos Ganados" 
                value={wonLeads} 
                icon={<DollarSign className="text-emerald-600" size={20}/>} 
            />
            <KpiCard 
                title="Tasa de Cierre" 
                value={`${conversionRate}%`} 
                icon={<TrendingUp className="text-indigo-600" size={20}/>} 
            />
        </div>
      </div>

      {/* --- LISTA DE LEADS (CRM) --- */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        
        {/* Toolbar de la tabla */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                Solicitudes Recientes
            </h3>
            
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                {['todos', 'nuevo', 'contactado', 'ganado'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full capitalize transition-all whitespace-nowrap ${filterStatus === status ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                        {status}
                    </button>
                ))}
            </div>
        </div>

        {/* Tabla / Lista */}
        <div className="overflow-x-auto">
            {loading ? (
                <div className="p-10 text-center text-slate-400">Cargando leads...</div>
            ) : filteredLeads.length === 0 ? (
                <div className="p-16 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="text-slate-300" size={32}/>
                    </div>
                    <h4 className="text-slate-900 font-bold">Sin resultados</h4>
                    <p className="text-slate-500 text-sm">No hay leads en esta categoría aún.</p>
                </div>
            ) : (
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold">
                        <tr>
                            <th className="p-4 w-[250px]">Cliente</th>
                            <th className="p-4 w-[400px]">Proyecto / Mensaje</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {filteredLeads.map((lead) => (
                            <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="p-4 align-top">
                                    <div className="font-bold text-slate-900">{lead.nombre_cliente}</div>
                                    <div className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                                        <Mail size={12}/> {lead.email_cliente}
                                    </div>
                                    <div className="text-slate-400 text-[10px] mt-2">
                                        {new Date(lead.created_at).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="p-4 align-top">
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-slate-600 italic leading-relaxed text-xs relative">
                                        <MessageSquare size={14} className="absolute -top-2 -left-2 text-indigo-200 bg-white rounded-full"/>
                                        "{lead.mensaje}"
                                    </div>
                                </td>
                                <td className="p-4 align-top">
                                    <div className="relative group/status inline-block">
                                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold border capitalize cursor-pointer select-none flex items-center gap-1 ${getStatusColor(lead.estado)}`}>
                                            {lead.estado}
                                        </span>
                                        
                                        {/* Dropdown simple de cambio de estado */}
                                        <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg z-20 w-32 hidden group-hover/status:block animate-in fade-in slide-in-from-top-2">
                                            {['nuevo', 'contactado', 'negociacion', 'ganado', 'perdido'].map((st) => (
                                                <button 
                                                    key={st}
                                                    onClick={() => updateLeadStatus(lead.id, st)}
                                                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 capitalize text-slate-600"
                                                >
                                                    {st}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 align-top text-right">
                                    <div className="flex justify-end gap-2">
                                        {negocio.whatsapp && (
                                            <a 
                                                href={`https://wa.me/${negocio.whatsapp}?text=Hola ${lead.nombre_cliente}, recibimos tu consulta sobre "${lead.mensaje.substring(0, 20)}..."`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                                                title="Contactar por WhatsApp"
                                            >
                                                <Phone size={16}/>
                                            </a>
                                        )}
                                        <a 
                                            href={`mailto:${lead.email_cliente}`}
                                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                                            title="Enviar Email"
                                        >
                                            <Mail size={16}/>
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
      </div>
    </div>
  );
}

// Componente UI Auxiliar para Tarjetas
function KpiCard({ title, value, icon, trend, alert }: any) {
    return (
        <div className={`p-5 bg-white rounded-xl border shadow-sm transition-all hover:shadow-md ${alert ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">{title}</span>
                <div className={`p-2 rounded-lg ${alert ? 'bg-red-100' : 'bg-slate-50'}`}>{icon}</div>
            </div>
            <div className="text-2xl font-black text-slate-900">{value}</div>
            {trend && <div className="text-[10px] text-emerald-600 font-bold mt-1 bg-emerald-50 inline-block px-1.5 py-0.5 rounded">{trend}</div>}
        </div>
    )
}