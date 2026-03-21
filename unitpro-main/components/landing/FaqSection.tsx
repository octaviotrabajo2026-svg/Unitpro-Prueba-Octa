'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: '¿Necesito saber programar?',
    answer: 'Para nada. UnitPro está diseñado para que cualquier persona pueda crear y gestionar su web sin conocimientos técnicos.',
  },
  {
    question: '¿Qué pasa si quiero cancelar?',
    answer: 'Podés cancelar cuando quieras. Sin contratos de permanencia, sin penalidades. Tu plan se mantiene activo hasta el fin del período pago.',
  },
  {
    question: '¿Puedo usar mi dominio propio?',
    answer: 'Sí. Conectás tu dominio existente o comprás uno nuevo desde el panel. El proceso tarda menos de 10 minutos.',
  },
  {
    question: '¿Cómo funciona el sistema de bloques?',
    answer: 'Empezás con el plan base que incluye tu web y el editor. Después sumás los módulos que necesitás (turnos, CRM, marketing) y pagás solo por ellos.',
  },
  {
    question: '¿Hay contrato de permanencia?',
    answer: 'No. Mes a mes, sin ataduras. Podés cambiar de plan o cancelar en cualquier momento desde tu panel.',
  },
  {
    question: '¿Los precios son en ARS o USD?',
    answer: 'Los precios están en USD. Para clientes de Argentina, la conversión se realiza al tipo de cambio oficial al momento del pago.',
  },
  {
    question: '¿Qué diferencia hay entre negocio directo y agencia?',
    answer: 'El plan de negocio es para una sola empresa. El plan agencia te permite gestionar múltiples negocios bajo tu marca, con panel unificado y precios por volumen.',
  },
  {
    question: '¿Puedo probar antes de pagar?',
    answer: 'Sí. Tenemos 14 días de prueba gratuita con acceso completo. No se requiere tarjeta de crédito.',
  },
  {
    question: '¿Cuánto tarda en estar online?',
    answer: 'Tu web puede estar online en menos de 24 horas desde que creás tu cuenta. Con los datos básicos listos, en minutos.',
  },
  {
    question: '¿Tiene integración con Google Calendar?',
    answer: 'Sí. El módulo de turnos sincroniza automáticamente con Google Calendar. También tenemos integración con WhatsApp Business.',
  },
];

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function handleToggle(index: number) {
    setOpenIndex((prev) => (prev === index ? null : index));
  }

  return (
    <section id="faq" className="py-24 px-6 md:px-12 lg:px-24 bg-white/40 border-y border-neutral-200/50">
      <div className="max-w-3xl mx-auto">

        {/* Encabezado */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-4 text-neutral-900">
            Preguntas frecuentes
          </h2>
          <p className="text-xl text-neutral-600 font-medium">
            Todo lo que necesitás saber antes de empezar.
          </p>
        </motion.div>

        {/* Lista de preguntas */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="bg-[#eee9dd] border border-neutral-200/60 rounded-2xl overflow-hidden"
              >
                {/* Pregunta — botón accesible */}
                <button
                  onClick={() => handleToggle(index)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between px-6 py-5 text-left gap-4 group"
                >
                  <span className="font-semibold text-neutral-900 text-base leading-snug group-hover:text-[#4c6618] transition-colors">
                    {faq.question}
                  </span>
                  {/* Ícono que rota al abrir */}
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.25 }}
                    className="shrink-0 text-[#4c6618]"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </button>

                {/* Respuesta animada */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 text-neutral-600 font-medium leading-relaxed text-sm border-t border-neutral-200/60 pt-4">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
