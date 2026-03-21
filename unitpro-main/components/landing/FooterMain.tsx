'use client';

import Image from 'next/image';
import Link from 'next/link';

const columns = [
  {
    title: 'Producto',
    links: [
      { label: 'Features', href: '#' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Integraciones', href: '#' },
      { label: 'Roadmap', href: '#' },
    ],
  },
  {
    title: 'Empresa',
    links: [
      { label: 'Sobre UnitPro', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Contacto', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Términos y condiciones', href: '#' },
      { label: 'Política de privacidad', href: '#' },
    ],
  },
];

// SVGs inline simples para redes sociales
function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconLinkedin() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconTwitter() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconWhatsapp() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const socialLinks = [
  { label: 'Instagram', href: '#', icon: <IconInstagram /> },
  { label: 'LinkedIn', href: '#', icon: <IconLinkedin /> },
  { label: 'Twitter / X', href: '#', icon: <IconTwitter /> },
  { label: 'WhatsApp', href: '#', icon: <IconWhatsapp /> },
];

export default function FooterMain() {
  return (
    <footer className="bg-white/40 border-t border-neutral-200/60 pt-16 pb-8 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto">

        {/* Grid principal: logo + 4 columnas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">

          {/* Columna logo */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 overflow-hidden flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="UnitPro Logo"
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>
              <span className="font-black text-xl tracking-tighter text-neutral-900">UnitPro</span>
            </div>
            <p className="text-sm text-neutral-500 font-medium leading-relaxed max-w-xs">
              Tu web, tus turnos, tu CRM.
            </p>
          </div>

          {/* Columnas de links */}
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4">
                {col.title}
              </p>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm font-medium text-neutral-600 hover:text-[#4c6618] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Columna redes */}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500 mb-4">
              Redes
            </p>
            <ul className="space-y-3">
              {socialLinks.map((social) => (
                <li key={social.label}>
                  <Link
                    href={social.href}
                    aria-label={social.label}
                    className="flex items-center gap-2.5 text-sm font-medium text-neutral-600 hover:text-[#4c6618] transition-colors group"
                  >
                    <span className="group-hover:scale-110 transition-transform">
                      {social.icon}
                    </span>
                    {social.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Linea inferior */}
        <div className="border-t border-neutral-200/60 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-neutral-500 font-medium">
          <span>© 2025 UnitPro. Todos los derechos reservados.</span>
          <span>Hecho con ♥ en Argentina</span>
        </div>

      </div>
    </footer>
  );
}
