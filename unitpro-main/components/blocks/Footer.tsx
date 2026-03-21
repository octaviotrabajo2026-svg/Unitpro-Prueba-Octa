import { FooterSection } from "@/types/web-config";
import { Instagram, Facebook, Linkedin, MessageCircle } from "lucide-react";

export function Footer({ data, negocioNombre }: { data: FooterSection, negocioNombre: string }) {
  if (!data.mostrar) return null;

  const social = data.redesSociales || {};

  return (
    <footer className="bg-zinc-900 text-zinc-400 py-12 text-center border-t border-zinc-800">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Nombre del Negocio */}
        <h4 className="text-white font-bold text-xl mb-6 tracking-tight">{negocioNombre}</h4>
        
        {/* Redes Sociales */}
        <div className="flex flex-wrap justify-center gap-6 mb-8">
            
            {/* INSTAGRAM */}
            {social.instagram && (
                <a 
                    href={social.instagram} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium hover:text-pink-400 transition-colors"
                >
                    <Instagram size={18} />
                    <span>Instagram</span>
                </a>
            )}

            {/* FACEBOOK */}
            {social.facebook && (
                <a 
                    href={social.facebook} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium hover:text-blue-400 transition-colors"
                >
                    <Facebook size={18} />
                    <span>Facebook</span>
                </a>
            )}

            {/* LINKEDIN */}
            {social.linkedin && (
                <a 
                    href={social.linkedin} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium hover:text-sky-400 transition-colors"
                >
                    <Linkedin size={18} />
                    <span>LinkedIn</span>
                </a>
            )}

            {/* WHATSAPP (Si se agrega al config) */}
            {social.whatsapp && (
                <a 
                    href={social.whatsapp.startsWith('http') ? social.whatsapp : `https://wa.me/${social.whatsapp.replace(/[^0-9]/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-medium hover:text-green-400 transition-colors"
                >
                    <MessageCircle size={18} />
                    <span>WhatsApp</span>
                </a>
            )}
        </div>

        {/* Copyright */}
        <div className="border-t border-zinc-800 pt-8">
            <p className="text-xs opacity-60">
                {data.textoCopyright || `© ${new Date().getFullYear()} ${negocioNombre}. Todos los derechos reservados.`}
            </p>
        </div>
      </div>
    </footer>
  );
}