'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { League_Spartan } from 'next/font/google';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  Layers,
  Globe,
  Calendar,
  Users,
  Star,
  MessageSquare,
  TrendingUp,
  Building2,
  Palette,
  BarChart,
  Package,
  DollarSign,
  Headphones,
  UserPlus,
  Megaphone,
  Menu,
  X,
} from 'lucide-react';
import PricingSection from '@/components/landing/PricingSection';
import FaqSection from '@/components/landing/FaqSection';
import FooterMain from '@/components/landing/FooterMain';

const leagueSpartan = League_Spartan({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
});

// ---------------------------------------------------------------------------
// Variantes de animación reutilizadas en toda la página
// ---------------------------------------------------------------------------
const fadeInUp = {
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

// ---------------------------------------------------------------------------
// Datos de la sección "Cómo te ayuda UnitPro"
// ---------------------------------------------------------------------------
type TabKey = 'negocios' | 'agencias';

const tabFeatures: Record<TabKey, { icon: React.ReactNode; title: string }[]> = {
  negocios: [
    { icon: <Globe className="w-5 h-5" />, title: 'Web profesional lista en minutos' },
    { icon: <Calendar className="w-5 h-5" />, title: 'Sistema de turnos online 24/7' },
    { icon: <Users className="w-5 h-5" />, title: 'CRM para gestionar tus clientes' },
    { icon: <Star className="w-5 h-5" />, title: 'Reseñas y reputación online' },
    { icon: <MessageSquare className="w-5 h-5" />, title: 'Integración con WhatsApp' },
    { icon: <TrendingUp className="w-5 h-5" />, title: 'Marketing y campañas automáticas' },
  ],
  agencias: [
    { icon: <Building2 className="w-5 h-5" />, title: 'Gestioná múltiples negocios desde un panel' },
    { icon: <Palette className="w-5 h-5" />, title: 'White-label: tu marca, tu dominio' },
    { icon: <BarChart className="w-5 h-5" />, title: 'Reportes y analytics por cliente' },
    { icon: <Package className="w-5 h-5" />, title: 'Activá y desactivá bloques por cliente' },
    { icon: <DollarSign className="w-5 h-5" />, title: 'Precios diferenciados por volumen' },
    { icon: <Headphones className="w-5 h-5" />, title: 'Soporte prioritario para agencias' },
  ],
};

// ---------------------------------------------------------------------------
// Datos de pasos "Cómo funciona"
// ---------------------------------------------------------------------------
const steps = [
  {
    number: '01',
    icon: <UserPlus className="w-7 h-7" />,
    title: 'Creás tu cuenta',
    description: 'Registrate en minutos. Completás el perfil de tu negocio y elegís tu plan.',
  },
  {
    number: '02',
    icon: <Layers className="w-7 h-7" />,
    title: 'Configurás tus bloques',
    description: 'Elegís los módulos que necesitás: turnos, CRM, galería, marketing... Solo pagás lo que usás.',
  },
  {
    number: '03',
    icon: <Globe className="w-7 h-7" />,
    title: 'Publicás y listo',
    description: 'Con un clic tu web está online. Empezás a recibir clientes desde el día uno.',
  },
];

// ---------------------------------------------------------------------------
// Datos de features (8 tarjetas)
// ---------------------------------------------------------------------------
type TagType = 'Incluido' | 'Bloque adicional' | 'Pro Agencia';

const featureCards: {
  icon: React.ReactNode;
  title: string;
  description: string;
  tag: TagType;
}[] = [
  {
    icon: <Globe className="w-7 h-7" />,
    title: 'Web Profesional',
    description: 'Landing page optimizada para mobile y SEO. Lista para recibir clientes desde el día uno.',
    tag: 'Incluido',
  },
  {
    icon: <Calendar className="w-7 h-7" />,
    title: 'Sistema de Turnos',
    description: 'Reservas online 24/7. Recordatorios automáticos y sincronización con Google Calendar.',
    tag: 'Bloque adicional',
  },
  {
    icon: <Users className="w-7 h-7" />,
    title: 'CRM de Clientes',
    description: 'Historial completo de cada cliente. Notas, seguimientos y campañas segmentadas.',
    tag: 'Bloque adicional',
  },
  {
    icon: <Layers className="w-7 h-7" />,
    title: 'Galería / Portfolio',
    description: 'Mostrá tu trabajo con una galería profesional. Arrastrá, soltá y publicá.',
    tag: 'Bloque adicional',
  },
  {
    icon: <Star className="w-7 h-7" />,
    title: 'Reseñas y Google Reviews',
    description: 'Captá reseñas automáticamente y respondelas desde tu panel.',
    tag: 'Bloque adicional',
  },
  {
    icon: <Megaphone className="w-7 h-7" />,
    title: 'Marketing y Campañas',
    description: 'Email y WhatsApp marketing integrado. Alcanzá a tus clientes en el momento justo.',
    tag: 'Bloque adicional',
  },
  {
    icon: <Globe className="w-7 h-7" />,
    title: 'Dominio Propio',
    description: 'Usá tu propio dominio o elegí uno de los nuestros. Tu marca, tu identidad.',
    tag: 'Incluido',
  },
  {
    icon: <Building2 className="w-7 h-7" />,
    title: 'Multi-agencia (White-label)',
    description: 'Para agencias: gestioná todos tus clientes desde un panel unificado con tu marca.',
    tag: 'Pro Agencia',
  },
];

const tagStyles: Record<TagType, string> = {
  'Incluido': 'bg-[#c9efa3] text-[#4c6618]',
  'Bloque adicional': 'bg-amber-100 text-amber-700',
  'Pro Agencia': 'bg-purple-100 text-purple-700',
};

// ---------------------------------------------------------------------------
// Datos de testimonios
// ---------------------------------------------------------------------------
const testimonials = [
  {
    initials: 'MG',
    name: 'María González',
    business: 'Peluquería Barber Co.',
    quote: 'Antes perdía la mitad de los turnos por WhatsApp. Ahora mis clientes reservan solos y yo me enfoco en lo que amo.',
  },
  {
    initials: 'JR',
    name: 'Juan Ramírez',
    business: 'Estudio de Fotografía',
    quote: 'La galería es impresionante. Mis clientes ven el portfolio y reservan sesión directamente. Simple y poderoso.',
  },
  {
    initials: 'DM',
    name: 'Dra. María López',
    business: 'Clínica Dental Norte',
    quote: 'El CRM nos cambió la vida. Vemos el historial de cada paciente en segundos. Vale cada peso.',
  },
  {
    initials: 'AL',
    name: 'Agustín Leiva',
    business: 'Agencia Creativa',
    quote: 'Gestiono 12 negocios desde un solo panel. El white-label es perfecto, mis clientes ven mi marca.',
  },
  {
    initials: 'SC',
    name: 'Sofía Castro',
    business: 'Arquitecta',
    quote: 'Mi portfolio nunca se vio tan bien. Los clientes llegan a la primera reunión ya enamorados del trabajo.',
  },
  {
    initials: 'PM',
    name: 'Pablo Mendoza',
    business: 'Fitness Studio',
    quote: 'Las campañas de WhatsApp duplicaron mis renovaciones de membresía. No lo puedo creer.',
  },
];

// ---------------------------------------------------------------------------
// Nombres para el marquee
// ---------------------------------------------------------------------------
const marqueeNames = [
  'Studio Foto',
  'Clínica Dental Norte',
  'Peluquería Barber Co.',
  'Fitness Studio',
  'Arq. Estudio',
  'Academia de Idiomas',
  'Centro Médico',
  'Agencia Creativa',
];

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('negocios');

  return (
    <div
      className={`min-h-screen bg-[#eee9dd] text-neutral-900 overflow-x-hidden font-sans ${leagueSpartan.className} selection:bg-[#c9efa3]`}
    >

      {/* ------------------------------------------------------------------ */}
      {/* NAVBAR                                                              */}
      {/* ------------------------------------------------------------------ */}
      <nav className="sticky top-0 z-50 bg-[#eee9dd]/80 backdrop-blur-md border-b border-neutral-300/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-black text-xl tracking-tighter">
            <div className="w-9 h-9 overflow-hidden flex items-center justify-center">
              <Image src="/logo.png" alt="UnitPro Logo" width={36} height={36} className="object-contain" />
            </div>
            UnitPro
          </Link>

          {/* Links desktop */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#como-funciona" className="text-sm font-semibold text-neutral-600 hover:text-[#4c6618] transition-colors">
              Cómo funciona
            </Link>
            <Link href="#pricing" className="text-sm font-semibold text-neutral-600 hover:text-[#4c6618] transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="text-sm font-semibold text-neutral-600 hover:text-[#4c6618] transition-colors">
              FAQ
            </Link>
          </div>

          {/* CTAs desktop */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-bold text-neutral-600 hover:text-[#4c6618] transition-colors px-4 py-2 rounded-full hover:bg-[#c9efa3]/30"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="bg-[#4c6618] text-[#eee9dd] px-5 py-2.5 rounded-full text-sm font-bold hover:bg-[#3a4e12] transition-all hover:scale-105 shadow-md"
            >
              Empezar ahora
            </Link>
          </div>

          {/* Hamburguesa mobile */}
          <button
            className="md:hidden p-2 rounded-xl hover:bg-neutral-200/50 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Drawer mobile */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="md:hidden overflow-hidden border-t border-neutral-200/60 bg-[#eee9dd]"
            >
              <div className="flex flex-col gap-1 px-6 py-4">
                <Link href="#como-funciona" onClick={() => setIsMenuOpen(false)} className="py-3 text-base font-semibold text-neutral-700 hover:text-[#4c6618] transition-colors border-b border-neutral-100">
                  Cómo funciona
                </Link>
                <Link href="#pricing" onClick={() => setIsMenuOpen(false)} className="py-3 text-base font-semibold text-neutral-700 hover:text-[#4c6618] transition-colors border-b border-neutral-100">
                  Pricing
                </Link>
                <Link href="#faq" onClick={() => setIsMenuOpen(false)} className="py-3 text-base font-semibold text-neutral-700 hover:text-[#4c6618] transition-colors border-b border-neutral-100">
                  FAQ
                </Link>
                <div className="flex flex-col gap-3 pt-4">
                  <Link href="/login" className="text-center py-3 text-base font-bold text-neutral-600 border border-neutral-300 rounded-full hover:border-[#4c6618] transition-colors">
                    Iniciar sesión
                  </Link>
                  <Link href="/register" className="text-center py-3 text-base font-bold bg-[#4c6618] text-[#eee9dd] rounded-full hover:bg-[#3a4e12] transition-colors">
                    Empezar ahora
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* HERO                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative pt-24 pb-24 px-6 md:px-12 lg:px-24 flex flex-col items-center justify-center min-h-screen text-center">

        {/* Círculos concéntricos animados — mantenidos del código original */}
        <motion.div
          className="relative flex items-center justify-center w-64 h-64 md:w-80 md:h-80 mb-12"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-[#4c6618] shadow-2xl"
            variants={{ hidden: { scale: 0, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { duration: 0.8, ease: 'backOut' } } }}
          />
          <motion.div
            className="absolute inset-[15%] rounded-full bg-[#649237] shadow-xl"
            variants={{ hidden: { scale: 0, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { duration: 0.8, ease: 'backOut' } } }}
          />
          <motion.div
            className="absolute inset-[30%] rounded-full bg-[#8fab5d] shadow-lg"
            variants={{ hidden: { scale: 0, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { duration: 0.8, ease: 'backOut' } } }}
          />
          <motion.div
            className="absolute inset-[45%] rounded-full bg-[#c9efa3] shadow-md"
            variants={{ hidden: { scale: 0, opacity: 0 }, visible: { scale: 1, opacity: 1, transition: { duration: 0.8, ease: 'backOut' } } }}
          />
        </motion.div>

        {/* Textos del Hero */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="max-w-4xl mx-auto"
        >
          {/* Badge pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#c9efa3]/40 text-[#4c6618] text-xs font-bold uppercase tracking-widest mb-6 border border-[#8fab5d]/30">
            Nuevo: integración con WhatsApp y Google Calendar
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-6 text-neutral-900 leading-none pb-2">
            Tu web, tus turnos,<br />tu CRM. Todo en un lugar.
          </h1>

          <p className="text-lg md:text-xl font-medium text-neutral-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Sin complicaciones, sin código, sin excusas. UnitPro hace fácil lo que parecía imposible para tu negocio de servicios.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 bg-[#4c6618] hover:bg-[#3a4e12] transition-colors text-[#eee9dd] rounded-full font-bold text-lg tracking-tight flex items-center justify-center gap-2 group shadow-lg shadow-[#4c6618]/20"
            >
              Empezar ahora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#como-funciona"
              className="w-full sm:w-auto px-8 py-4 bg-transparent border-2 border-neutral-300 hover:border-neutral-900 text-neutral-900 rounded-full font-bold text-lg tracking-tight transition-all flex items-center justify-center"
            >
              Cómo funciona ↓
            </Link>
          </div>

          <p className="mt-8 text-sm font-medium text-neutral-500">
            14 días de prueba gratuita. No requiere tarjeta de crédito.
          </p>
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SOCIAL PROOF BELT — Marquee                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-12 border-y border-neutral-200/60 bg-white/30 overflow-hidden">
        {/* Inyección de keyframes inline */}
        <style>{`
          @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
          .animate-marquee { animation: marquee 20s linear infinite; }
        `}</style>

        <p className="text-center text-xs font-bold uppercase tracking-widest text-neutral-500 mb-6">
          Más de 500 negocios ya digitalizados
        </p>

        <div className="relative flex overflow-hidden">
          {/* Gradientes de fade lateral */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#eee9dd]/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#eee9dd]/80 to-transparent z-10 pointer-events-none" />

          {/* Lista duplicada para el loop infinito */}
          <div className="flex animate-marquee whitespace-nowrap gap-12 shrink-0">
            {[...marqueeNames, ...marqueeNames].map((name, i) => (
              <span
                key={i}
                className="text-base font-bold text-neutral-400 hover:text-[#4c6618] transition-colors cursor-default px-2"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* SECCIÓN VALOR — Cómo te ayuda UnitPro                              */}
      {/* ------------------------------------------------------------------ */}
      <section id="como-te-ayuda" className="py-24 px-6 md:px-12 lg:px-24">
        <div className="max-w-5xl mx-auto">

          <motion.div
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-neutral-900">
              Un sistema completo para cada tipo de negocio
            </h2>
          </motion.div>

          {/* Tabs */}
          <motion.div
            className="flex justify-center mb-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <div className="inline-flex bg-white border border-neutral-200 rounded-full p-1.5 shadow-sm">
              <button
                onClick={() => setActiveTab('negocios')}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${activeTab === 'negocios' ? 'bg-[#4c6618] text-[#eee9dd] shadow-md' : 'text-neutral-600 hover:text-neutral-900'}`}
              >
                Negocios de servicios
              </button>
              <button
                onClick={() => setActiveTab('agencias')}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 ${activeTab === 'agencias' ? 'bg-[#4c6618] text-[#eee9dd] shadow-md' : 'text-neutral-600 hover:text-neutral-900'}`}
              >
                Agencias digitales
              </button>
            </div>
          </motion.div>

          {/* Grid de features por tab — AnimatePresence */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {tabFeatures[activeTab].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 bg-white border border-neutral-100 rounded-2xl px-5 py-4 shadow-sm hover:border-[#8fab5d] transition-colors"
                >
                  <div className="w-10 h-10 bg-[#c9efa3] text-[#4c6618] rounded-xl flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <span className="text-sm font-semibold text-neutral-800">{item.title}</span>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>

        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CÓMO FUNCIONA — 3 pasos                                            */}
      {/* ------------------------------------------------------------------ */}
      <section id="como-funciona" className="py-24 px-6 md:px-12 lg:px-24 bg-white/40 border-y border-neutral-200/50">
        <div className="max-w-6xl mx-auto">

          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-neutral-900">
              En 3 pasos, online
            </h2>
          </motion.div>

          <motion.div
            className="flex flex-col lg:flex-row items-stretch gap-8 lg:gap-0"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {steps.map((step, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="flex-1 relative"
              >
                {/* Línea conectora entre pasos (solo desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(100%-1rem)] w-8 h-px bg-[#8fab5d] z-10" />
                )}

                <div className="bg-[#eee9dd] border border-neutral-200/60 rounded-3xl p-8 mx-0 lg:mx-4 h-full relative overflow-hidden">
                  {/* Número de fondo decorativo */}
                  <span className="absolute top-2 right-4 text-8xl font-black text-neutral-900/5 leading-none select-none">
                    {step.number}
                  </span>

                  <div className="w-12 h-12 bg-[#c9efa3] text-[#4c6618] rounded-2xl flex items-center justify-center mb-5 relative z-10">
                    {step.icon}
                  </div>
                  <h3 className="text-xl font-bold tracking-tight mb-3 text-neutral-900 relative z-10">
                    {step.title}
                  </h3>
                  <p className="text-neutral-600 font-medium leading-relaxed text-sm relative z-10">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FEATURES — 8 tarjetas                                              */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-24 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto">

          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-neutral-900">
              Todo lo que necesitás, en un solo lugar
            </h2>
            <p className="text-xl text-neutral-600 font-medium max-w-xl mx-auto">
              Activá solo los módulos que tu negocio necesita.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
          >
            {featureCards.map((card, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-white border border-neutral-200/60 rounded-3xl p-7 flex gap-5 hover:shadow-xl hover:border-[#8fab5d] transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-[#c9efa3] text-[#4c6618] rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  {card.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold tracking-tight text-neutral-900">{card.title}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tagStyles[card.tag]}`}>
                      {card.tag}
                    </span>
                  </div>
                  <p className="text-neutral-600 font-medium leading-relaxed text-sm">{card.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* PRICING — componente externo                                        */}
      {/* ------------------------------------------------------------------ */}
      <PricingSection />

      {/* ------------------------------------------------------------------ */}
      {/* TESTIMONIOS                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-24 px-6 md:px-12 lg:px-24 bg-white/40 border-y border-neutral-200/50">
        <div className="max-w-7xl mx-auto">

          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-4 text-neutral-900">
              Negocios que lo están usando
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {testimonials.map((t, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="bg-[#eee9dd] border border-neutral-200/60 rounded-3xl p-7"
              >
                <div className="flex items-center gap-4 mb-5">
                  {/* Avatar circular con iniciales */}
                  <div
                    className="w-11 h-11 rounded-full bg-[#c9efa3] text-[#4c6618] font-black text-sm flex items-center justify-center shrink-0"
                    aria-label={`Avatar de ${t.name}`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-bold text-neutral-900 text-sm">{t.name}</p>
                    <p className="text-xs text-neutral-500 font-medium">{t.business}</p>
                  </div>
                </div>
                <p className="text-neutral-700 font-medium leading-relaxed text-sm italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </motion.div>
            ))}
          </motion.div>

        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FAQ — componente externo                                            */}
      {/* ------------------------------------------------------------------ */}
      <FaqSection />

      {/* ------------------------------------------------------------------ */}
      {/* CTA FINAL                                                           */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-24 px-6 md:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="max-w-5xl mx-auto bg-gradient-to-br from-[#4c6618] to-[#2a380d] rounded-[3rem] p-12 md:p-20 text-[#eee9dd] shadow-2xl shadow-[#4c6618]/30 relative overflow-hidden text-center"
        >
          {/* Blobs decorativos */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#8fab5d] opacity-20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#c9efa3] opacity-10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-5">
              ¿Listo para digitalizar tu negocio?
            </h2>
            <p className="text-[#c9efa3] mb-10 text-lg md:text-xl font-medium max-w-xl mx-auto leading-relaxed">
              Miles de negocios ya dieron el paso. El tuyo puede ser el próximo.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#eee9dd] text-[#4c6618] rounded-full font-bold text-base hover:bg-white transition-all hover:scale-105 shadow-xl"
              >
                Empezar ahora <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="#"
                className="inline-flex items-center gap-2 px-8 py-4 border-2 border-[#eee9dd]/50 text-[#eee9dd] rounded-full font-bold text-base hover:border-[#eee9dd] hover:bg-white/10 transition-all"
              >
                Hablar con ventas
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FOOTER — componente externo                                         */}
      {/* ------------------------------------------------------------------ */}
      <FooterMain />

    </div>
  );
}
