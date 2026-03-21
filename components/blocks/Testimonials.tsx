import { User } from "lucide-react";
import { TestimonialsSection } from "@/types/web-config";

export function Testimonials({ data, primaryColor }: { data: TestimonialsSection, primaryColor: string }) {
  if (!data.mostrar) return null;

  return (
    <section className="py-20 bg-zinc-50 overflow-hidden">
      {/* Le sacamos el px-6 a este contenedor y se lo pasamos a los elementos por separado */}
      <div className="max-w-6xl mx-auto">
        
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 text-zinc-900 px-6">
          {data.titulo}
        </h2>
        
        <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* Carrusel: Le agregamos px-6 acá para que respete el margen inicial, pero permita hacer scroll hasta el borde */}
        <div 
          className="hide-scrollbar flex md:grid md:grid-cols-3 gap-6 overflow-x-auto snap-x snap-mandatory px-6 pb-8 pt-2 md:pb-0 md:overflow-visible"
          style={{ scrollbarWidth: 'none' }} 
        >
          {data.items.map((item, i) => (
            <div 
              key={i} 
              // 👇 CAMBIO CLAVE: snap-start en lugar de snap-center
              className="w-[85vw] sm:w-[350px] md:w-auto shrink-0 snap-start bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-zinc-100 flex flex-col"
            >
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm" 
                  style={{ backgroundColor: primaryColor }}
                >
                  <User size={20} />
                </div>
                <div className="overflow-hidden">
                  <p className="font-bold text-sm text-zinc-900 truncate">{item.nombre}</p>
                  {item.cargo && <p className="text-xs text-zinc-500 truncate">{item.cargo}</p>}
                </div>
              </div>
              <p className="text-zinc-600 text-sm italic whitespace-normal">"{item.comentario}"</p>
            </div>
          ))}
          
          {/* Espaciador invisible para que el último testimonio no quede pegado al borde derecho al deslizar */}
          <div className="w-1 md:hidden shrink-0"></div>
        </div>

      </div>
    </section>
  );
}