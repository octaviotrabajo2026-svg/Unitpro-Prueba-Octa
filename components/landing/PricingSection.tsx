'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import Link from 'next/link';

type PlanType = 'negocio' | 'agencia';

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

// Features para el plan Negocio
const businessAddons = [
  { name: 'Sistema de Turnos', price: '+$15/mes' },
  { name: 'CRM de Clientes', price: '+$12/mes' },
  { name: 'Galería / Portfolio', price: '+$8/mes' },
  { name: 'Reseñas y Reviews', price: '+$10/mes' },
  { name: 'Marketing y Campañas', price: '+$18/mes' },
];

// Features incluidos en el plan Agencia
const agencyFeatures = [
  'Panel unificado para todos tus clientes',
  'White-label con tu marca y dominio',
  'Todos los bloques disponibles sin costo adicional',
  'Reportes y analytics por cliente',
  'Precios diferenciados por volumen',
  'Soporte prioritario 24/7',
  'API de integración personalizada',
];

// Tabla de comparación
const comparisonRows = [
  { feature: 'Web profesional', negocio: true, agencia: true },
  { feature: 'Editor de contenido', negocio: true, agencia: true },
  { feature: 'Soporte por email', negocio: true, agencia: true },
  { feature: 'Sistema de turnos', negocio: 'Bloque +$15', agencia: true },
  { feature: 'CRM de clientes', negocio: 'Bloque +$12', agencia: true },
  { feature: 'Marketing y campañas', negocio: 'Bloque +$18', agencia: true },
  { feature: 'Multi-negocio', negocio: false, agencia: true },
  { feature: 'White-label', negocio: false, agencia: true },
  { feature: 'Soporte prioritario', negocio: false, agencia: true },
  { feature: 'Analytics avanzados', negocio: false, agencia: true },
];

function CellValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return <Check className="w-5 h-5 text-[#4c6618] mx-auto" />;
  }
  if (value === false) {
    return <X className="w-5 h-5 text-neutral-400 mx-auto" />;
  }
  return <span className="text-sm text-amber-700 font-medium">{value}</span>;
}

export default function PricingSection() {
  const [activePlan, setActivePlan] = useState<PlanType>('negocio');

  return (
    <section id="pricing" className="py-24 px-6 md:px-12 lg:px-24">
      <div className="max-w-5xl mx-auto">

        {/* Encabezado */}
        <motion.div
          className="text-center mb-14"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-4 text-neutral-900">
            Pagás solo lo que usás
          </h2>
          <p className="text-xl text-neutral-600 font-medium max-w-xl mx-auto">
            Base paga, sin sorpresas. Sumás los bloques que tu negocio necesita.
          </p>
        </motion.div>

        {/* Tabs de plan */}
        <motion.div
          className="flex justify-center mb-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <div className="inline-flex bg-white border border-neutral-200 rounded-full p-1.5 shadow-sm">
            <button
              onClick={() => setActivePlan('negocio')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
                activePlan === 'negocio'
                  ? 'bg-[#4c6618] text-[#eee9dd] shadow-md'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Negocio directo
            </button>
            <button
              onClick={() => setActivePlan('agencia')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${
                activePlan === 'agencia'
                  ? 'bg-[#4c6618] text-[#eee9dd] shadow-md'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Agencia
            </button>
          </div>
        </motion.div>

        {/* Panel de plan — AnimatePresence para transición */}
        <AnimatePresence mode="wait">
          {activePlan === 'negocio' ? (
            <motion.div
              key="negocio"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white border border-neutral-200 rounded-3xl p-8 md:p-10 shadow-sm"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">

                {/* Plan base */}
                <div className="flex-1">
                  <span className="inline-block px-3 py-1 rounded-full bg-[#c9efa3] text-[#4c6618] text-xs font-bold uppercase tracking-wider mb-4">
                    Plan Base
                  </span>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-black text-neutral-900">$29</span>
                    <span className="text-neutral-500 font-medium">USD/mes</span>
                  </div>
                  <p className="text-neutral-600 mb-6 text-sm">Todo lo que necesitás para estar online.</p>

                  <ul className="space-y-3 mb-8">
                    {['Web profesional incluida', 'Editor de contenido visual', 'Soporte por email'].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm font-medium text-neutral-700">
                        <Check className="w-4 h-4 text-[#4c6618] shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/register"
                    className="inline-block w-full text-center px-6 py-3.5 bg-[#4c6618] text-[#eee9dd] rounded-full font-bold hover:bg-[#3a4e12] transition-colors shadow-md"
                  >
                    Crear cuenta de negocio
                  </Link>
                </div>

                {/* Bloques adicionales */}
                <div className="flex-1">
                  <p className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">
                    Bloques adicionales
                  </p>
                  <ul className="space-y-3">
                    {businessAddons.map((addon) => (
                      <li key={addon.name} className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
                        <div className="flex items-center gap-3">
                          {/* Checkbox simulado */}
                          <div className="w-4 h-4 rounded border-2 border-neutral-300 flex items-center justify-center shrink-0" />
                          <span className="text-sm font-medium text-neutral-700">{addon.name}</span>
                        </div>
                        <span className="text-sm font-bold text-[#4c6618]">{addon.price}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="agencia"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-[#4c6618] rounded-3xl p-8 md:p-10 shadow-xl text-[#eee9dd] relative overflow-hidden"
            >
              {/* Blob decorativo */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#8fab5d] opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-8">

                {/* Info principal */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-block px-3 py-1 rounded-full bg-[#c9efa3] text-[#4c6618] text-xs font-bold uppercase tracking-wider">
                      Plan Agencia
                    </span>
                    <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-[#c9efa3] text-xs font-bold uppercase tracking-wider border border-[#c9efa3]/40">
                      Mas popular
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-black">desde $79</span>
                    <span className="text-[#c9efa3] font-medium">USD/mes</span>
                  </div>
                  <p className="text-[#c9efa3]/80 mb-2 text-sm">Minimo 3 negocios incluidos.</p>
                  <p className="text-[#c9efa3]/80 mb-6 text-sm">Cada negocio adicional: <strong className="text-[#c9efa3]">+$20/mes</strong></p>

                  <Link
                    href="/register?type=agency"
                    className="inline-block w-full text-center px-6 py-3.5 bg-[#eee9dd] text-[#4c6618] rounded-full font-bold hover:bg-white transition-colors shadow-md"
                  >
                    Crear cuenta de agencia
                  </Link>
                </div>

                {/* Features incluidas */}
                <div className="flex-1">
                  <p className="text-sm font-bold text-[#c9efa3] uppercase tracking-wider mb-4">
                    Todo incluido
                  </p>
                  <ul className="space-y-3">
                    {agencyFeatures.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm font-medium text-[#eee9dd]/90">
                        <Check className="w-4 h-4 text-[#c9efa3] shrink-0 mt-0.5" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabla de comparacion */}
        <motion.div
          className="mt-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h3 className="text-2xl font-bold tracking-tight text-center mb-8 text-neutral-800">
            Comparacion de planes
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-neutral-200 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="text-left px-6 py-4 font-bold text-neutral-700 w-1/2">Feature</th>
                  <th className="text-center px-6 py-4 font-bold text-neutral-700">Negocio</th>
                  <th className="text-center px-6 py-4 font-bold text-[#4c6618]">Agencia</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, index) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-neutral-100 last:border-0 ${index % 2 === 0 ? 'bg-white' : 'bg-neutral-50/50'}`}
                  >
                    <td className="px-6 py-4 font-medium text-neutral-700">{row.feature}</td>
                    <td className="px-6 py-4 text-center"><CellValue value={row.negocio} /></td>
                    <td className="px-6 py-4 text-center"><CellValue value={row.agencia} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
