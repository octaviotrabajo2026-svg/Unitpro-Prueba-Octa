'use client'

import { useState, useEffect } from 'react'
import { blockTime, getBlocks, deleteBlock } from '@/app/actions/service-booking/block-time'
import { Trash2, CalendarOff } from 'lucide-react' // Asegúrate de tener lucide-react o usa otro ícono

export default function BlockTimeManager({ slug, workers }: { slug: string, workers?: any[] }) {
  const [loading, setLoading] = useState(false);
  const [blocks, setBlocks] = useState<any[]>([]); // Lista de bloqueos
  const [formData, setFormData] = useState({
    date: '',
    startTime: '09:00',
    endTime: '17:00',
    reason: '',
    workerId: 'all',
    isAllDay: false
  });

  // Cargar bloqueos al iniciar
  useEffect(() => {
    loadBlocks();
  }, []);

  const loadBlocks = async () => {
    const res = await getBlocks(slug);
    if (res.success) setBlocks(res.blocks || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const res = await blockTime(slug, {
        ...formData,
        workerId: formData.workerId === 'all' ? undefined : formData.workerId
    });

    if (res.success) {
        alert('Bloqueo creado exitosamente.');
        setFormData({ ...formData, reason: '' });
        loadBlocks(); // Recargar la lista
    } else {
        alert('Error: ' + res.error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if(!confirm('¿Eliminar este bloqueo y liberar el horario?')) return;
    
    const res = await deleteBlock(slug, id);
    if (res.success) {
        loadBlocks(); // Recargar lista
    } else {
        alert('Error al eliminar');
    }
  };

  // Helper para mostrar nombre del profesional
  const getWorkerName = (id: string) => {
    if (id === 'all') return 'Todo el Negocio';
    const w = workers?.find(w => String(w.id) === String(id));
    return w ? w.nombre : 'Profesional desconocido';
  };

  // Helper formato fecha
  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('es-AR', { 
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="space-y-8">
      {/* 1. FORMULARIO DE CREACIÓN */}
      <div className="p-5 border rounded-xl bg-white shadow-sm">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <CalendarOff className="text-red-600" size={20}/> 
            Bloquear Horario Nuevo
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label>
                    <input 
                        type="date" required className="w-full p-2 border rounded bg-gray-50"
                        value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                </div>
                {workers && workers.length > 0 && (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Afectado</label>
                        <select 
                            className="w-full p-2 border rounded bg-gray-50"
                            value={formData.workerId} onChange={e => setFormData({...formData, workerId: e.target.value})}
                        >
                            <option value="all">🚫 Todo el Local (Cerrado)</option>
                            {workers.map(w => <option key={w.id} value={w.id}>👤 {w.nombre}</option>)}
                        </select>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 my-2">
                <input 
                    type="checkbox" id="allDay" className="w-4 h-4 text-blue-600"
                    checked={formData.isAllDay} onChange={e => setFormData({...formData, isAllDay: e.target.checked})}
                />
                <label htmlFor="allDay" className="text-sm font-medium text-gray-700">Día completo</label>
            </div>

            {!formData.isAllDay && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Desde</label>
                        <input type="time" className="w-full p-2 border rounded" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hasta</label>
                        <input type="time" className="w-full p-2 border rounded" value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} />
                    </div>
                </div>
            )}

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Motivo</label>
                <input 
                    type="text" placeholder="Ej: Vacaciones, Feriado..." className="w-full p-2 border rounded"
                    value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}
                />
            </div>

            <button type="submit" disabled={loading} className="w-full bg-zinc-900 text-white py-2 rounded hover:bg-black transition text-sm font-bold">
                {loading ? 'Procesando...' : 'Confirmar Bloqueo'}
            </button>
        </form>
      </div>

      {/* 2. LISTA DE BLOQUEOS ACTIVOS */}
      <div className="p-5 border rounded-xl bg-gray-50">
        <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase">Bloqueos Futuros Activos</h3>
        
        {blocks.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No hay bloqueos activos.</p>
        ) : (
            <div className="space-y-3">
                {blocks.map((block) => (
                    <div key={block.id} className="flex justify-between items-center bg-white p-3 rounded border shadow-sm">
                        <div>
                            <p className="font-bold text-sm text-red-600">{block.summary.replace('⛔ BLOQUEO: ', '')}</p>
                            <p className="text-xs text-gray-500">
                                {formatDate(block.start)} - {formatDate(block.end)}
                            </p>
                            <span className="inline-block mt-1 text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-bold uppercase">
                                {getWorkerName(block.workerId)}
                            </span>
                        </div>
                        <button 
                            onClick={() => handleDelete(block.id)}
                            className="text-gray-400 hover:text-red-600 transition p-2"
                            title="Eliminar bloqueo"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}