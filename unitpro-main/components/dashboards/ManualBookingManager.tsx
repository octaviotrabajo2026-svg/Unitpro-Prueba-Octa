// components/dashboards/ManualBookingManager.tsx
'use client'

import { useState } from 'react'
import { createManualAppointment } from '@/app/actions/confirm-booking/manage-appointment'
import { UserPlus, Clock, Phone, Mail, User } from 'lucide-react'

export default function ManualBookingManager({ slug, workers, services }: { slug: string, workers?: any[], services?: any[] }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: '',
    startTime: '09:00',
    duration: '60',
    clientName: '',
    clientAreaCode: '',
    clientLocalNumber: '',
    clientEmail: '',
    workerId: workers?.[0]?.id || '',
    service: services?.[0]?.name || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Calcular fecha fin basada en duración
    const start = new Date(`${formData.date}T${formData.startTime}:00`)
    const end = new Date(start.getTime() + Number(formData.duration) * 60000)
    
    const workerName = workers?.find(w => String(w.id) === String(formData.workerId))?.nombre || 'Profesional'

    const numeroArmado = `+549${formData.clientAreaCode}${formData.clientLocalNumber}`;

    const res = await createManualAppointment(slug, {
      ...formData,
      clientPhone: numeroArmado,
      start: start.toISOString(),
      end: end.toISOString(),
      workerName
    })

    if (res.success) {
      alert('Turno agendado exitosamente.')
      setFormData({ ...formData, clientName: '',clientAreaCode: '', clientLocalNumber: '', clientEmail: '' })
    } else {
      alert('Error: ' + res.error)
    }
    setLoading(false)
  }

  return (
    <div className="p-6 border rounded-2xl bg-white shadow-sm max-w-2xl">
      <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
        <UserPlus className="text-indigo-600" size={22}/> 
        Agendar Turno Manualmente
      </h3>
      <form onSubmit={handleSubmit} className="space-y-5"> {/* Aumenté el espaciado vertical */}
        
        {/* FILA 1: DATOS CLIENTE (Nombre y Email) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cliente</label>
            <input 
              required placeholder="Nombre y Apellido" className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm"
              value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
            <input 
              type="email" placeholder="cliente@mail.com" className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm"
              value={formData.clientEmail} onChange={e => setFormData({...formData, clientEmail: e.target.value})}
            />
          </div>
        </div>

        {/* FILA NUEVA: TELÉFONO (Formato Landing) */}
        <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número de WhatsApp</label>
            <div className="flex gap-2 items-center">
                {/* PREFIJO FIJO */}
                <div className="flex items-center justify-center px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-600 font-bold shrink-0 select-none text-sm">
                    🇦🇷 +54 9
                </div>
                {/* CÓDIGO DE ÁREA */}
                <input 
                    required 
                    type="tel"
                    placeholder="Área (Ej: 11)" 
                    className="w-[90px] p-2.5 border rounded-xl bg-gray-50 text-sm text-center font-medium" 
                    value={formData.clientAreaCode}
                    onChange={e => setFormData({...formData, clientAreaCode: e.target.value.replace(/\D/g, '')})}
                    maxLength={4}
                />
                {/* RESTO DEL NÚMERO */}
                <input 
                    required 
                    type="tel"
                    placeholder="Número (Ej: 2345 6789)" 
                    className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm font-medium" 
                    value={formData.clientLocalNumber}
                    onChange={e => setFormData({...formData, clientLocalNumber: e.target.value.replace(/\D/g, '')})}
                    maxLength={10}
                />
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5 ml-1 leading-tight">
                Ingresá el código de área <b>sin el 0</b> y el número <b>sin el 15</b>.
            </p>
        </div>

        {/* FILA 2: FECHA Y HORA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label>
            <input 
              type="date" required className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm"
              value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora</label>
              <input type="time" required className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duración</label>
              <select className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})}>
                <option value="30">30 min</option>
                <option value="60">1 hora</option>
                <option value="90">1.5 h</option>
                <option value="120">2 horas</option>
              </select>
            </div>
          </div>
        </div>

        {/* FILA 3: PROFESIONAL Y SERVICIO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Profesional</label>
                <select className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm" value={formData.workerId} onChange={e => setFormData({...formData, workerId: e.target.value})}>
                    <option value="">Cualquiera / Sin asignar</option>
                    {workers?.map((w: any) => <option key={w.id} value={w.id}>{w.nombre}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Servicio</label>
                <select className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm" value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})}>
                    <option value="">Seleccionar servicio...</option>
                    {services?.map((s: any, idx: number) => {
                        // Corrección: Maneja si 's' es string o objeto, y muestra si es promo
                        const name = s.name || s; 
                        return <option key={idx} value={name}>{name} {s.isPromo ? '(Promo)' : ''}</option>
                    })}
                </select>
            </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition font-bold shadow-lg shadow-indigo-100 mt-4">
          {loading ? 'Agendando...' : 'Confirmar y Sincronizar'}
        </button>
      </form>
    </div>
  )
}