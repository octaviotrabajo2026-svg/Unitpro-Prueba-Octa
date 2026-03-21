"use client";
// blocks/academy/editor/AcademyPanel.tsx

import { useState, useEffect } from 'react';
import { Plus, GraduationCap, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { ImageUpload } from '@/components/ui/ImageUpload';
import type { BlockEditorProps } from '@/types/blocks';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Course {
  id: string;
  negocio_id: number;
  title: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  level: string;
  duration_hours: number | null;
  active: boolean;
  is_free: boolean;
  created_at: string;
  // joined count desde la query
  course_lessons?: { count: number }[];
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content_url: string | null;
  content_type: string;
  order_index: number;
  is_preview: boolean;
  duration_minutes: number | null;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const PRIMARY = '#577a2c';

const LEVELS = [
  { value: 'beginner',     label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced',     label: 'Avanzado' },
];

const LESSON_TYPES = [
  { value: 'video', label: 'Video' },
  { value: 'text',  label: 'Texto' },
  { value: 'pdf',   label: 'PDF' },
];

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
const contentTypeLabel: Record<string, string> = {
  video: 'Video',
  text:  'Texto',
  pdf:   'PDF',
};

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">
      {children}
    </label>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        value ? 'bg-[#577a2c]' : 'bg-zinc-300'
      }`}
      aria-label={value ? 'Desactivar' : 'Activar'}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AcademyPanel({ config, updateConfig, editorMode, negocio }: BlockEditorProps) {
  const supabase = createClient();
  const mode = editorMode ?? 'easy';
  const academy = (config.academy as any) || {};

  // Estado de cursos
  const [courses, setCourses]     = useState<Course[]>([]);
  const [loading, setLoading]     = useState(true);

  // Modal de nuevo curso
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);

  // Campos del formulario de curso
  const [fTitle, setFTitle]       = useState('');
  const [fDesc, setFDesc]         = useState('');
  const [fPrice, setFPrice]       = useState('0');
  const [fLevel, setFLevel]       = useState('beginner');
  const [fDuration, setFDuration] = useState('');
  const [fThumb, setFThumb]       = useState('');

  // Panel de lecciones expandido
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [lessons, setLessons]                   = useState<Lesson[]>([]);
  const [showLessonForm, setShowLessonForm]      = useState(false);
  const [savingLesson, setSavingLesson]          = useState(false);

  // Campos del formulario de lección
  const [lTitle, setLTitle]       = useState('');
  const [lUrl, setLUrl]           = useState('');
  const [lType, setLType]         = useState('video');
  const [lDuration, setLDuration] = useState('');
  const [lPreview, setLPreview]   = useState(false);
  const [lOrder, setLOrder]       = useState('0');

  // Confirmaciones inline de borrado
  const [courseToDelete, setCourseToDelete]   = useState<string | null>(null);
  const [lessonToDelete, setLessonToDelete]   = useState<string | null>(null);

  // Toast de error (evita alert())
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadCourses();
  }, [negocio?.id]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  }

  /** Carga los cursos del negocio junto con el conteo de lecciones */
  async function loadCourses() {
    if (!negocio?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*, course_lessons(*)')
        .eq('negocio_id', negocio.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCourses((data as Course[]) || []);
    } catch (err: any) {
      showToast('Error al cargar cursos: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  /** Abre modal limpio para nuevo curso */
  function openNewModal() {
    setFTitle('');
    setFDesc('');
    setFPrice('0');
    setFLevel('beginner');
    setFDuration('');
    setFThumb('');
    setShowModal(true);
  }

  /** Inserta el curso nuevo en la base de datos */
  async function handleSaveCourse() {
    if (!fTitle.trim()) return;
    setSaving(true);
    try {
      const price = parseFloat(fPrice) || 0;
      const { error } = await supabase.from('courses').insert({
        negocio_id:     negocio.id,
        title:          fTitle.trim(),
        description:    fDesc.trim() || null,
        price,
        is_free:        price === 0,
        level:          fLevel,
        duration_hours: fDuration ? parseFloat(fDuration) : null,
        thumbnail_url:  fThumb || null,
        active:         true,
      });
      if (error) throw error;
      setShowModal(false);
      await loadCourses();
    } catch (err: any) {
      showToast('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  /** Activa o desactiva un curso */
  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase
      .from('courses')
      .update({ active: !current })
      .eq('id', id);
    if (!error) {
      setCourses(prev => prev.map(c => c.id === id ? { ...c, active: !current } : c));
    } else {
      showToast('Error: ' + error.message);
    }
  }

  /** Elimina un curso (cascade borra lecciones por FK) */
  async function confirmDeleteCourse(id: string) {
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (!error) {
      setCourses(prev => prev.filter(c => c.id !== id));
      if (selectedCourseId === id) setSelectedCourseId(null);
    } else {
      showToast('Error al eliminar: ' + error.message);
    }
    setCourseToDelete(null);
  }

  /** Abre o cierra el panel de lecciones de un curso */
  async function toggleLessonsPanel(courseId: string) {
    if (selectedCourseId === courseId) {
      setSelectedCourseId(null);
      return;
    }
    setSelectedCourseId(courseId);
    setShowLessonForm(false);
    setLessonToDelete(null);
    try {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      setLessons((data as Lesson[]) || []);
    } catch (err: any) {
      showToast('Error al cargar lecciones: ' + err.message);
    }
  }

  /** Guarda una lección nueva para el curso seleccionado */
  async function handleSaveLesson() {
    if (!lTitle.trim() || !selectedCourseId) return;
    setSavingLesson(true);
    try {
      const { error } = await supabase.from('course_lessons').insert({
        course_id:        selectedCourseId,
        title:            lTitle.trim(),
        content_url:      lUrl.trim() || null,
        content_type:     lType,
        order_index:      parseInt(lOrder) || 0,
        is_preview:       lPreview,
        duration_minutes: lDuration ? parseInt(lDuration) : null,
      });
      if (error) throw error;
      // Resetear campos del formulario de lección
      setLTitle('');
      setLUrl('');
      setLType('video');
      setLDuration('');
      setLPreview(false);
      setLOrder('0');
      setShowLessonForm(false);
      // Recargar lecciones del curso abierto
      await toggleLessonsPanel(selectedCourseId);
      // Reabrir el panel si se cerró accidentalmente
      setSelectedCourseId(selectedCourseId);
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setSavingLesson(false);
    }
  }

  /** Elimina una lección */
  async function confirmDeleteLesson(id: string) {
    const { error } = await supabase.from('course_lessons').delete().eq('id', id);
    if (!error) {
      setLessons(prev => prev.filter(l => l.id !== id));
    } else {
      showToast('Error al eliminar: ' + error.message);
    }
    setLessonToDelete(null);
  }

  return (
    <div className="space-y-6">

      {/* Toast de error */}
      {toast && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span>{toast}</span>
          <button onClick={() => setToast('')} className="shrink-0 p-1 hover:bg-red-100 rounded-lg" aria-label="Cerrar">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Gestión de cursos (Easy + Pro) ─────────────────────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">Cursos</h3>
          </div>
          <button
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold hover:opacity-90 transition-all"
            style={{ backgroundColor: PRIMARY }}
          >
            <Plus size={13} /> Nuevo
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-zinc-400 py-2">Cargando cursos…</p>
        ) : courses.length === 0 ? (
          <div className="py-8 text-center">
            <GraduationCap size={32} className="mx-auto text-zinc-200 mb-2" />
            <p className="text-xs text-zinc-400">Sin cursos. Creá el primero con el botón de arriba.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {courses.map(course => {
              const lessonCount = Array.isArray(course.course_lessons) ? course.course_lessons.length : 0;
              return (
                <div key={course.id} className="bg-zinc-50 border border-zinc-200 rounded-xl overflow-hidden">
                  {/* Fila del curso */}
                  <div className="flex items-center gap-3 p-3">
                    {/* Thumbnail */}
                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-100 shrink-0 flex items-center justify-center">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                      ) : (
                        <GraduationCap size={16} className="text-zinc-300" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900 truncate">{course.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${levelBadge[course.level] || 'bg-zinc-100 text-zinc-500'}`}>
                          {levelLabel[course.level] || course.level}
                        </span>
                        <span className="text-[11px] text-zinc-500">
                          {course.is_free || course.price === 0 ? 'Gratis' : `$${course.price.toLocaleString('es-AR')}`}
                        </span>
                        <span className="text-[11px] text-zinc-400">{lessonCount} lec.</span>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Expandir lecciones */}
                      <button
                        onClick={() => toggleLessonsPanel(course.id)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-lg transition-colors"
                        aria-label="Ver lecciones"
                      >
                        {selectedCourseId === course.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <Toggle
                        value={course.active}
                        onChange={() => toggleActive(course.id, course.active)}
                      />
                      <button
                        onClick={() => setCourseToDelete(course.id)}
                        className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Eliminar curso"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Confirmación inline de eliminación de curso */}
                  {courseToDelete === course.id && (
                    <div className="flex items-center gap-2 mx-3 mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs">
                      <span className="flex-1 text-red-700 font-medium">¿Eliminar este curso y sus lecciones?</span>
                      <button
                        onClick={() => confirmDeleteCourse(course.id)}
                        className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setCourseToDelete(null)}
                        className="px-3 py-1 rounded-lg border border-zinc-300 text-zinc-600 font-bold hover:bg-zinc-100 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}

                  {/* Panel de lecciones inline */}
                  {selectedCourseId === course.id && (
                    <div className="border-t border-zinc-200 bg-white p-3 space-y-2">
                      {lessons.length === 0 && !showLessonForm && (
                        <p className="text-[11px] text-zinc-400 text-center py-1">Sin lecciones aún</p>
                      )}

                      {/* Lista de lecciones */}
                      {lessons.map(lesson => (
                        <div key={lesson.id}>
                          <div className="flex items-center gap-2 bg-zinc-50 rounded-lg p-2.5 border border-zinc-100">
                            <span className="text-[10px] text-zinc-400 w-4 text-center shrink-0">{lesson.order_index}</span>
                            <span className="flex-1 text-xs font-medium text-zinc-800 truncate">{lesson.title}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
                              {contentTypeLabel[lesson.content_type] || lesson.content_type}
                            </span>
                            {lesson.duration_minutes != null && (
                              <span className="text-[10px] text-zinc-400 shrink-0">{lesson.duration_minutes}min</span>
                            )}
                            {lesson.is_preview && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                                Preview
                              </span>
                            )}
                            <button
                              onClick={() => setLessonToDelete(lesson.id)}
                              className="p-1 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              aria-label="Eliminar lección"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          {/* Confirmación inline de eliminación de lección */}
                          {lessonToDelete === lesson.id && (
                            <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs">
                              <span className="flex-1 text-red-700 font-medium">¿Eliminar esta lección?</span>
                              <button
                                onClick={() => confirmDeleteLesson(lesson.id)}
                                className="px-2 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setLessonToDelete(null)}
                                className="px-2 py-1 rounded-lg border border-zinc-300 text-zinc-600 font-bold hover:bg-zinc-100 transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Formulario nueva lección */}
                      {showLessonForm ? (
                        <div className="bg-zinc-50 rounded-xl p-3 border border-zinc-200 space-y-2.5">
                          <input
                            type="text"
                            value={lTitle}
                            onChange={e => setLTitle(e.target.value)}
                            placeholder="Título de la lección *"
                            className="w-full p-2 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#577a2c]/30 bg-white"
                          />
                          <input
                            type="text"
                            value={lUrl}
                            onChange={e => setLUrl(e.target.value)}
                            placeholder="URL del video / contenido"
                            className="w-full p-2 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#577a2c]/30 bg-white"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={lType}
                              onChange={e => setLType(e.target.value)}
                              className="p-2 border border-zinc-200 rounded-lg text-xs outline-none bg-white"
                            >
                              {LESSON_TYPES.map(lt => (
                                <option key={lt.value} value={lt.value}>{lt.label}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={lDuration}
                              onChange={e => setLDuration(e.target.value)}
                              placeholder="Duración (min)"
                              className="p-2 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#577a2c]/30 bg-white"
                            />
                          </div>
                          <div className="flex items-center gap-4">
                            <input
                              type="number"
                              value={lOrder}
                              onChange={e => setLOrder(e.target.value)}
                              placeholder="Orden"
                              className="w-20 p-2 border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#577a2c]/30 bg-white"
                            />
                            <label className="flex items-center gap-2 text-xs cursor-pointer text-zinc-600">
                              <input
                                type="checkbox"
                                checked={lPreview}
                                onChange={e => setLPreview(e.target.checked)}
                                className="rounded"
                              />
                              Es preview
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowLessonForm(false)}
                              className="flex-1 py-1.5 rounded-lg text-xs font-bold border border-zinc-200 hover:bg-zinc-100 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={handleSaveLesson}
                              disabled={savingLesson || !lTitle.trim()}
                              className="flex-1 py-1.5 rounded-lg text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                              style={{ backgroundColor: PRIMARY }}
                            >
                              {savingLesson ? 'Guardando…' : 'Guardar'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowLessonForm(true)}
                          className="w-full py-2 rounded-xl border border-dashed border-zinc-300 text-[11px] text-zinc-500 hover:bg-zinc-50 hover:border-zinc-400 transition-all flex items-center justify-center gap-1"
                        >
                          <Plus size={11} /> Agregar lección
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Config visual (Easy + Pro) ──────────────────────────────────── */}
      <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
          <span className="w-2 h-2 rounded-full bg-zinc-400" />
          <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">Apariencia</h3>
        </div>

        <div className="flex items-center justify-between">
          <Label>Mostrar sección</Label>
          <Toggle
            value={academy.mostrar !== false}
            onChange={v => updateConfig('academy', 'mostrar', v)}
          />
        </div>

        <div>
          <Label>Título de sección</Label>
          <input
            type="text"
            value={academy.titulo || 'Academia'}
            onChange={e => updateConfig('academy', 'titulo', e.target.value)}
            className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
          />
        </div>

        <div>
          <Label>Subtítulo</Label>
          <input
            type="text"
            value={academy.subtitulo || 'Aprendé a tu ritmo'}
            onChange={e => updateConfig('academy', 'subtitulo', e.target.value)}
            className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
          />
        </div>
      </section>

      {/* ── Configuración avanzada (Pro only) ──────────────────────────── */}
      {mode === 'pro' && (
        <section className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <h3 className="font-bold text-zinc-800 text-xs uppercase tracking-wide">
              Configuración avanzada
            </h3>
          </div>

          {/* Layout */}
          <div>
            <Label>Layout</Label>
            <div className="flex gap-2">
              {(['grid', 'lista'] as const).map(val => (
                <button
                  key={val}
                  onClick={() => updateConfig('academy', 'layout', val)}
                  className={`flex-1 py-2 text-xs border rounded-lg font-medium transition-all capitalize ${
                    (academy.layout || 'grid') === val
                      ? 'border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold'
                      : 'bg-white text-zinc-500 border-zinc-200'
                  }`}
                >
                  {val === 'grid' ? 'Grid' : 'Lista'}
                </button>
              ))}
            </div>
          </div>

          {/* Columnas — solo si layout es grid */}
          {(academy.layout || 'grid') === 'grid' && (
            <div>
              <Label>Columnas</Label>
              <div className="flex gap-2">
                {(['2', '3'] as const).map(val => (
                  <button
                    key={val}
                    onClick={() => updateConfig('academy', 'columns', val)}
                    className={`flex-1 py-2 text-xs border rounded-lg font-medium transition-all ${
                      (academy.columns || '3') === val
                        ? 'border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold'
                        : 'bg-white text-zinc-500 border-zinc-200'
                    }`}
                  >
                    {val} cols
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Texto del botón CTA */}
          <div>
            <Label>Texto botón CTA</Label>
            <input
              type="text"
              value={academy.ctaText || 'Inscribirme'}
              onChange={e => updateConfig('academy', 'ctaText', e.target.value)}
              className="w-full p-2 border border-zinc-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#577a2c]/30 outline-none"
            />
          </div>

          {/* Mostrar precio */}
          <div className="flex items-center justify-between">
            <Label>Mostrar precio</Label>
            <Toggle
              value={academy.mostrarPrecio !== false}
              onChange={v => updateConfig('academy', 'mostrarPrecio', v)}
            />
          </div>

          {/* Mostrar duración */}
          <div className="flex items-center justify-between">
            <Label>Mostrar duración</Label>
            <Toggle
              value={academy.mostrarDuracion !== false}
              onChange={v => updateConfig('academy', 'mostrarDuracion', v)}
            />
          </div>
        </section>
      )}

      {/* ── Modal nuevo curso ───────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="font-bold text-lg">Nuevo curso</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
                aria-label="Cerrar modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cuerpo scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {/* Título */}
              <div>
                <Label>Título *</Label>
                <input
                  type="text"
                  value={fTitle}
                  onChange={e => setFTitle(e.target.value)}
                  placeholder="Ej: Marketing Digital desde cero"
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30"
                />
              </div>

              {/* Descripción */}
              <div>
                <Label>Descripción</Label>
                <textarea
                  value={fDesc}
                  onChange={e => setFDesc(e.target.value)}
                  rows={3}
                  placeholder="Descripción del curso"
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-[#577a2c]/30"
                />
              </div>

              {/* Precio y duración */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Precio (0 = gratis)</Label>
                  <input
                    type="number"
                    value={fPrice}
                    onChange={e => setFPrice(e.target.value)}
                    min={0}
                    placeholder="0"
                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30"
                  />
                </div>
                <div>
                  <Label>Duración (horas)</Label>
                  <input
                    type="number"
                    value={fDuration}
                    onChange={e => setFDuration(e.target.value)}
                    min={0}
                    step={0.5}
                    placeholder="Ej: 4.5"
                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30"
                  />
                </div>
              </div>

              {/* Nivel */}
              <div>
                <Label>Nivel</Label>
                <div className="flex gap-2">
                  {LEVELS.map(lvl => (
                    <button
                      key={lvl.value}
                      onClick={() => setFLevel(lvl.value)}
                      className={`flex-1 py-2 text-xs border rounded-lg font-medium transition-all ${
                        fLevel === lvl.value
                          ? 'border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold'
                          : 'bg-white text-zinc-500 border-zinc-200'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thumbnail */}
              <ImageUpload
                label="Thumbnail del curso"
                value={fThumb}
                onChange={setFThumb}
              />
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-zinc-100">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCourse}
                disabled={saving || !fTitle.trim()}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{ backgroundColor: PRIMARY }}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
