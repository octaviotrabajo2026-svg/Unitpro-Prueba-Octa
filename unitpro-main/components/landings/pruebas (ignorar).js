{/* --- RENDERIZADO DINÁMICO DE SECCIONES --- */}
      {activeOrder.map((sectionId: string) => {
          
          // 1. HERO
          if (sectionId === 'hero' && config.hero.mostrar) {
              return (
                <header key="hero" id="inicio" className="relative w-full h-screen min-h-[600px] flex items-center justify-center overflow-hidden" onClick={(e) => handleEditClick(e, 'hero')}>
                     {/* ... (PEGA AQUÍ TU CÓDIGO DEL HERO EXACTO, el que tienes ahora) ... */}
                     <div className="absolute inset-0 w-full h-full z-0">
                        <img src={heroImage} className="w-full h-full object-cover" alt="Fondo"/>
                        <div className="absolute inset-0 bg-black transition-all duration-300" style={{ opacity: (config.hero.overlayOpacity || 50) / 100 }}></div>
                     </div>
                     <div className={`relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center gap-6 ${editableClass}`}>
                        {config.logoUrl && (
                            <div className="w-24 h-24 md:w-32 md:h-32 bg-white/10 backdrop-blur-md rounded-full p-4 mb-4 flex items-center justify-center shadow-2xl border border-white/20">
                                <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain drop-shadow-md"/>
                            </div>
                        )}
                        <div className="bg-white/10 backdrop-blur-sm border border-white/10 p-8 md:p-12 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-700">
                            <SafeHTML as="h1" html={config.hero.titulo} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 drop-shadow-lg" />
                            <SafeHTML as="p" html={config.hero.subtitulo} className="text-lg md:text-xl text-zinc-200 max-w-2xl mx-auto mb-8 leading-relaxed" />
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <button onClick={() => setIsBookingModalOpen(true)} className={`w-full sm:w-auto px-8 py-4 text-white font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 ${btnRadius}`} style={{ backgroundColor: brandColor }}>
                                    <CalendarIcon size={20}/> {config.hero.ctaTexto || "Reservar Turno"}
                                </button>
                                <button onClick={() => scrollToSection('servicios')} className="text-white hover:text-zinc-200 font-medium px-6 py-3 transition-colors">
                                    Ver Servicios
                                </button>
                            </div>
                        </div>
                     </div>
                </header>
              );
          }

          // 2. SERVICIOS
          if (sectionId === 'servicios' && config.servicios.mostrar) {
              return (
                  <section key="servicios" id="servicios" className="py-24 px-6" onClick={(e) => handleEditClick(e, 'servicios')}>
                    <div className={`max-w-7xl mx-auto ${editableClass}`}>
                        {config.servicios?.titulo && (
                            <div className="text-center mb-16">
                                <span className="text-sm font-bold uppercase tracking-wider opacity-60">Lo que hacemos</span>
                                <h2 className="text-3xl md:text-4xl font-bold mt-2" style={{ color: textColor }}>{config.servicios.titulo}</h2>
                                <div className="w-20 h-1.5 mt-4 mx-auto rounded-full" style={{ backgroundColor: brandColor }}></div>
                            </div>
                        )}
                        <div className="grid md:grid-cols-3 gap-8">
                            {config.servicios?.items?.map((item:any, i:number) => (
                                <div key={i} className={`p-8 border border-zinc-500/10 shadow-sm hover:shadow-xl transition-all duration-300 group ${radiusClass}`} style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                    <div className="w-14 h-14 mb-6 text-white rounded-2xl flex items-center justify-center shadow-lg transform group-hover:-translate-y-2 transition-transform" style={{ backgroundColor: brandColor }}>
                                        <CheckCircle size={28}/>
                                    </div>
                                    <h3 className="font-bold text-xl mb-3" style={{ color: textColor }}>{item.titulo}</h3>
                                    <p className="leading-relaxed opacity-70">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                  </section>
              );
          }

          // 3. UBICACIÓN
          if (sectionId === 'ubicacion' && config.ubicacion.mostrar) {
              return (
                  <section key="ubicacion" id="ubicacion" className="py-24 px-6 relative overflow-hidden" onClick={(e) => handleEditClick(e, 'contact')}>
                      <div className={`max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center ${editableClass}`}>
                          <div>
                              <span className="text-sm font-bold uppercase tracking-wider opacity-60">Dónde estamos</span>
                              <h2 className="text-3xl md:text-4xl font-bold mt-2 mb-6" style={{ color: textColor }}>Visítanos</h2>
                              <div className="space-y-6">
                                  <div className="flex items-start gap-4">
                                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: brandColor + '20', color: brandColor }}><MapPin size={20}/></div>
                                      <div><h4 className="font-bold" style={{ color: textColor }}>Dirección</h4><p className="opacity-70">{negocio.direccion}</p></div>
                                  </div>
                                  {/* ... resto de items de ubicación ... */}
                              </div>
                          </div>
                          <div className={`h-[400px] bg-zinc-100 overflow-hidden shadow-2xl relative ${radiusClass}`}>
                                <div className="absolute inset-0 bg-zinc-200 flex items-center justify-center text-zinc-400">
                                    <MapPin size={48} className="mx-auto mb-2 opacity-50"/>
                                </div>
                          </div>
                      </div>
                  </section>
              );
          }
          
          // 4. VALORACIONES (TESTIMONIOS)
          if (sectionId === 'testimonios' && config.testimonios?.mostrar) {
              return (
                  <section key="testimonios" className="py-20 px-6 bg-black/5" onClick={(e) => handleEditClick(e, 'testimonios')}>
                       <div className={`max-w-3xl mx-auto text-center ${editableClass}`}>
                          <h2 className="text-3xl font-bold mb-6" style={{ color: textColor }}>{config.testimonios.titulo}</h2>
                          <button onClick={() => setIsFeedbackModalOpen(true)} className={`px-8 py-3 bg-zinc-900 text-white font-bold ${btnRadius}`}>Dejar mi opinión</button>
                       </div>
                  </section>
              );
          }

          // 5. SECCIONES PERSONALIZADAS (Custom)
          // Buscamos si el ID actual corresponde a una sección custom
          const customSection = config.customSections?.find((s:any) => s.id === sectionId);
          
          if (customSection) {
             return (
                <section key={customSection.id} className="py-20 px-6 max-w-7xl mx-auto" id={`section-${customSection.id}`}>
                    {/* ABOUT (QUIENES SOMOS) */}
                    {customSection.type === 'about' && (
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className={customSection.imagenUrl ? 'order-1' : ''}>
                                <h2 className="text-3xl font-bold mb-6 text-zinc-900">{customSection.titulo}</h2>
                                <SafeHTML as="div" html={customSection.texto} className="text-lg text-zinc-600 leading-relaxed whitespace-pre-line" />
                            </div>
                            {customSection.imagenUrl && (
                                <div className={`overflow-hidden shadow-xl h-[400px] ${cardRadius}`}>
                                    <img src={customSection.imagenUrl} alt={customSection.titulo} className="w-full h-full object-cover"/>
                                </div>
                            )}
                        </div>
                    )}

                    {/* GALLERY */}
                    {customSection.type === 'gallery' && (
                        <div>
                            <h2 className="text-3xl font-bold mb-12 text-center text-zinc-900">{customSection.titulo}</h2>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {customSection.imagenes?.map((img: any, i: number) => (
                                    <div key={i} className={`group relative aspect-square overflow-hidden bg-zinc-100 ${cardRadius}`}>
                                        <img src={img.url} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
             );
          }

          return null;
      })}