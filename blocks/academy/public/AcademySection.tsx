"use client";
// blocks/academy/public/AcademySection.tsx

import { useState, useEffect } from 'react';
import { GraduationCap, Clock, BookOpen, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { BlockSectionProps } from '@/types/blocks';
import { enrollStudent } from "@/blocks/academy/actions";

interface Course {
  id: string;
  title: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  level: string;
  duration_hours: number | null;
  is_free: boolean;
}

interface Lesson {
  id: string;
  title: string;
  content_type: string;
  duration_minutes: number | null;
  is_preview: boolean;
}

const levelBadge: Record<string, string> = {
  beginner:     'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced:     'bg-red-100 text-red-700',
};
const levelLabel: Record<string, string> = {
  beginner:     'Principiante',
  intermediate: 'Intermedio',
  advanced:     'Avanzado',
};

export default function AcademySection({ negocio, config }: BlockSectionProps) {
  const supabase = createClient();
  const academyConfig = (config.academy as any) || {};
  const titulo = academyConfig.titulo || 'Academia';

  const colors = config?.colors as { primary?: string; text?: string; background?: string } | undefined;
  const PRIMARY = colors?.primary || negocio?.color_principal || '#577a2c';
  const TEXT_COLOR = colors?.text || '#111827';
  const BG_COLOR = colors?.background || '#ffffff';

  const [courses, setCourses]         = useState<Course[]>([]);
  const [loading, setLoading]         = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [lessons, setLessons]         = useState<Lesson[]>([]);
  const [showEnroll, setShowEnroll]   = useState(false);
  const [enrollName, setEnrollName]   = useState('');
  const [enrollEmail, setEnrollEmail] = useState('');
  const [enrolling, setEnrolling]     = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  useEffect(() => {
    loadCourses();
  }, [negocio.id]);

  /** Carga cursos activos del negocio */
  async function loadCourses() {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .eq('negocio_id', negocio.id)
      .eq('active', true)
      .order('created_at', { ascending: false });
    setCourses((data as Course[]) || []);
    setLoading(false);
  }

  /** Abre el modal de detalle del curso y carga lecciones preview */
  async function openCourseDetail(course: Course) {
    setSelectedCourse(course);
    setShowEnroll(false);
    setEnrollSuccess(false);
    const { data } = await supabase
      .from('course_lessons')
      .select('*')
      .eq('course_id', course.id)
      .eq('is_preview', true)
      .order('order_index', { ascending: true });
    setLessons((data as Lesson[]) || []);
  }

  function closeModal() {
    setSelectedCourse(null);
    setShowEnroll(false);
    setEnrollSuccess(false);
    setEnrollName('');
    setEnrollEmail('');
  }

  /** Registra la inscripción en course_enrollments */
  async function handleEnroll() {
  if (!enrollEmail.trim() || !selectedCourse) return;
  setEnrolling(true);
  try {
    const result = await enrollStudent(negocio.slug, {
      courseId: selectedCourse.id,
      studentName: enrollName.trim() || undefined,
      studentEmail: enrollEmail.trim(),
    });
    if (!result.success) throw new Error(result.error);
    setEnrollSuccess(true);
  } catch (err: any) {
    alert('Error al inscribirse: ' + err.message);
  } finally {
    setEnrolling(false);
  }
}

  const ctaText = academyConfig.ctaText || 'Inscribirme';

  if (loading) return null;

  return (
    <section className="py-16 px-4" style={{ backgroundColor: BG_COLOR }}>
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-2" style={{ color: PRIMARY }}>
          {titulo}
        </h2>
        <p className="text-center text-zinc-500 mb-10 text-sm">
          {academyConfig.subtitulo || 'Aprendé a tu ritmo'}
        </p>

        {courses.length === 0 ? (
          <div className="p-14 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
            <GraduationCap size={48} className="mx-auto mb-4" style={{ color: PRIMARY }} />
            <h3 className="text-xl font-bold text-zinc-800">Próximamente</h3>
            <p className="text-zinc-500 mt-2 text-sm">
              Estamos preparando contenido increíble para vos.
            </p>
          </div>
        ) : (
          <div className={`grid gap-6 ${
            academyConfig.layout === 'lista'
              ? 'grid-cols-1'
              : academyConfig.columns === '2'
                ? 'sm:grid-cols-2'
                : 'sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            {courses.map(course => (
              <button
                key={course.id}
                onClick={() => openCourseDetail(course)}
                className="text-left bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-zinc-200"
              >
                {/* Thumbnail */}
                <div className="h-40 overflow-hidden relative">
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${PRIMARY}22, ${PRIMARY}44)` }}
                    >
                      <GraduationCap size={40} style={{ color: PRIMARY }} />
                    </div>
                  )}
                  {course.is_free && (
                    <span className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      GRATIS
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-bold text-zinc-900 mb-2 line-clamp-2">{course.title}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${levelBadge[course.level] || 'bg-zinc-100 text-zinc-500'}`}>
                      {levelLabel[course.level] || course.level}
                    </span>
                    {course.duration_hours != null && academyConfig.mostrarDuracion !== false && (
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <Clock size={11} /> {course.duration_hours}h
                      </span>
                    )}
                    {academyConfig.mostrarPrecio !== false && !course.is_free && (
                      <span className="text-xs font-bold ml-auto" style={{ color: PRIMARY }}>
                        ${course.price.toLocaleString('es-AR')}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalle del curso */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-zinc-100">
              <div className="pr-4">
                <h3 className="font-bold text-lg text-zinc-900">{selectedCourse.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${levelBadge[selectedCourse.level] || 'bg-zinc-100 text-zinc-500'}`}>
                    {levelLabel[selectedCourse.level] || selectedCourse.level}
                  </span>
                  {selectedCourse.is_free ? (
                    <span className="text-xs font-bold text-green-600">Gratis</span>
                  ) : (
                    <span className="text-xs font-bold" style={{ color: PRIMARY }}>
                      ${selectedCourse.price.toLocaleString('es-AR')}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors shrink-0"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {selectedCourse.description && (
                <p className="text-sm text-zinc-600">{selectedCourse.description}</p>
              )}

              {lessons.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-zinc-400 uppercase mb-2">
                    Clases de muestra
                  </p>
                  <ul className="space-y-2">
                    {lessons.map(lesson => (
                      <li key={lesson.id} className="flex items-center gap-3 text-sm text-zinc-700">
                        <BookOpen size={14} className="text-zinc-400 shrink-0" />
                        <span>{lesson.title}</span>
                        {lesson.duration_minutes != null && (
                          <span className="ml-auto text-xs text-zinc-400">
                            {lesson.duration_minutes} min
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Formulario de inscripción */}
              {showEnroll && !enrollSuccess && (
                <div className="space-y-3 pt-2">
                  <input
                    type="text"
                    value={enrollName}
                    onChange={e => setEnrollName(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
                  />
                  <input
                    type="email"
                    value={enrollEmail}
                    onChange={e => setEnrollEmail(e.target.value)}
                    placeholder="Tu email *"
                    required
                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
                  />
                  {!selectedCourse.is_free && (
                    <p className="text-xs text-zinc-500 bg-amber-50 border border-amber-100 rounded-lg p-3">
                      El negocio te contactara para coordinar el pago.
                    </p>
                  )}
                </div>
              )}

              {enrollSuccess && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                  <p className="font-bold text-green-700 text-sm">
                    Inscripcion exitosa! Te contactaremos pronto.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            {!enrollSuccess && (
              <div className="p-6 border-t border-zinc-100">
                {!showEnroll ? (
                  <button
                    onClick={() => setShowEnroll(true)}
                    className="w-full py-3 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    {ctaText}
                  </button>
                ) : (
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowEnroll(false)}
                      className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-zinc-200 hover:bg-zinc-50 transition-colors"
                    >
                      Volver
                    </button>
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling || !enrollEmail.trim()}
                      className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: PRIMARY }}
                    >
                      {enrolling ? 'Enviando…' : selectedCourse.is_free ? 'Inscribirme gratis' : 'Enviar solicitud'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
