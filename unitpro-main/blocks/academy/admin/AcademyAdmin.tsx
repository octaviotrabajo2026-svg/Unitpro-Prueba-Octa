"use client";
/*
 * SQL A EJECUTAR EN SUPABASE (ejecutar manualmente en el SQL Editor):
 *
 * -- ── COURSES ──────────────────────────────────────────────────────────────────
 * DROP POLICY IF EXISTS "owner_all_courses" ON courses;
 * CREATE POLICY "owner_all_courses" ON courses FOR ALL USING (
 *   negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
 *   OR
 *   negocio_id IN (
 *     SELECT n.id FROM negocios n
 *     JOIN agencies a ON a.id = n.agency_id
 *     WHERE a.user_id = auth.uid()
 *   )
 * ) WITH CHECK (
 *   negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
 *   OR
 *   negocio_id IN (
 *     SELECT n.id FROM negocios n
 *     JOIN agencies a ON a.id = n.agency_id
 *     WHERE a.user_id = auth.uid()
 *   )
 * );
 *
 * -- ── COURSE_LESSONS ────────────────────────────────────────────────────────────
 * DROP POLICY IF EXISTS "owner_all_lessons" ON course_lessons;
 * CREATE POLICY "owner_all_lessons" ON course_lessons FOR ALL USING (
 *   course_id IN (
 *     SELECT c.id FROM courses c
 *     JOIN negocios n ON n.id = c.negocio_id
 *     WHERE n.user_id = auth.uid()
 *     OR n.agency_id IN (SELECT id FROM agencies WHERE user_id = auth.uid())
 *   )
 * ) WITH CHECK (
 *   course_id IN (
 *     SELECT c.id FROM courses c
 *     JOIN negocios n ON n.id = c.negocio_id
 *     WHERE n.user_id = auth.uid()
 *     OR n.agency_id IN (SELECT id FROM agencies WHERE user_id = auth.uid())
 *   )
 * );
 *
 * -- ── COURSE_ENROLLMENTS ────────────────────────────────────────────────────────
 * DROP POLICY IF EXISTS "owner_read_enrollments" ON course_enrollments;
 * CREATE POLICY "owner_read_enrollments" ON course_enrollments FOR ALL USING (
 *   course_id IN (
 *     SELECT c.id FROM courses c
 *     JOIN negocios n ON n.id = c.negocio_id
 *     WHERE n.user_id = auth.uid()
 *     OR n.agency_id IN (SELECT id FROM agencies WHERE user_id = auth.uid())
 *   )
 * );
 *
 * -- ── PRODUCTS ──────────────────────────────────────────────────────────────────
 * DROP POLICY IF EXISTS "owner_all_products" ON products;
 * CREATE POLICY "owner_all_products" ON products FOR ALL USING (
 *   negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
 *   OR
 *   negocio_id IN (
 *     SELECT n.id FROM negocios n
 *     JOIN agencies a ON a.id = n.agency_id
 *     WHERE a.user_id = auth.uid()
 *   )
 * ) WITH CHECK (
 *   negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
 *   OR
 *   negocio_id IN (
 *     SELECT n.id FROM negocios n
 *     JOIN agencies a ON a.id = n.agency_id
 *     WHERE a.user_id = auth.uid()
 *   )
 * );
 *
 * -- ── ORDERS ────────────────────────────────────────────────────────────────────
 * DROP POLICY IF EXISTS "owner_all_orders" ON orders;
 * CREATE POLICY "owner_all_orders" ON orders FOR ALL USING (
 *   negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
 *   OR
 *   negocio_id IN (
 *     SELECT n.id FROM negocios n
 *     JOIN agencies a ON a.id = n.agency_id
 *     WHERE a.user_id = auth.uid()
 *   )
 * );
 *
 * -- ── CRM_PIPELINE ─────────────────────────────────────────────────────────────
 * DROP POLICY IF EXISTS "owner_all_pipeline" ON crm_pipeline;
 * CREATE POLICY "owner_all_pipeline" ON crm_pipeline FOR ALL USING (
 *   negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
 *   OR
 *   negocio_id IN (
 *     SELECT n.id FROM negocios n
 *     JOIN agencies a ON a.id = n.agency_id
 *     WHERE a.user_id = auth.uid()
 *   )
 * ) WITH CHECK (
 *   negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
 *   OR
 *   negocio_id IN (
 *     SELECT n.id FROM negocios n
 *     JOIN agencies a ON a.id = n.agency_id
 *     WHERE a.user_id = auth.uid()
 *   )
 * );
 *
 * -- ── AUTOMATION_WORKFLOWS ─────────────────────────────────────────────────────
 * DROP POLICY IF EXISTS "negocio_owns_workflows" ON automation_workflows;
 * CREATE POLICY "negocio_owns_workflows" ON automation_workflows FOR ALL USING (
 *   negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
 *   OR
 *   negocio_id IN (
 *     SELECT n.id FROM negocios n
 *     JOIN agencies a ON a.id = n.agency_id
 *     WHERE a.user_id = auth.uid()
 *   )
 * ) WITH CHECK (
 *   negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
 *   OR
 *   negocio_id IN (
 *     SELECT n.id FROM negocios n
 *     JOIN agencies a ON a.id = n.agency_id
 *     WHERE a.user_id = auth.uid()
 *   )
 * );
 *
 * -- ── UNITCOINS_BALANCE ────────────────────────────────────────────────────────
 * DROP POLICY IF EXISTS "negocio_owns_balance" ON unitcoins_balance;
 * CREATE POLICY "negocio_owns_balance" ON unitcoins_balance FOR ALL USING (
 *   negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
 *   OR
 *   negocio_id IN (
 *     SELECT n.id FROM negocios n
 *     JOIN agencies a ON a.id = n.agency_id
 *     WHERE a.user_id = auth.uid()
 *   )
 * ) WITH CHECK (
 *   negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
 *   OR
 *   negocio_id IN (
 *     SELECT n.id FROM negocios n
 *     JOIN agencies a ON a.id = n.agency_id
 *     WHERE a.user_id = auth.uid()
 *   )
 * );
 *
 * -- ── UNITCOINS_TRANSACTIONS ───────────────────────────────────────────────────
 * DROP POLICY IF EXISTS "negocio_owns_transactions" ON unitcoins_transactions;
 * CREATE POLICY "negocio_owns_transactions" ON unitcoins_transactions FOR ALL USING (
 *   negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
 *   OR
 *   negocio_id IN (
 *     SELECT n.id FROM negocios n
 *     JOIN agencies a ON a.id = n.agency_id
 *     WHERE a.user_id = auth.uid()
 *   )
 * ) WITH CHECK (
 *   negocio_id IN (SELECT id FROM negocios WHERE user_id = auth.uid())
 *   OR
 *   negocio_id IN (
 *     SELECT n.id FROM negocios n
 *     JOIN agencies a ON a.id = n.agency_id
 *     WHERE a.user_id = auth.uid()
 *   )
 * );
 */
// blocks/academy/admin/AcademyAdmin.tsx
//
// CREATE TABLE IF NOT EXISTS courses (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   negocio_id integer REFERENCES negocios(id) ON DELETE CASCADE,
//   title text NOT NULL, description text,
//   price numeric(10,2) DEFAULT 0, thumbnail_url text,
//   level text DEFAULT 'beginner', duration_hours numeric(5,1),
//   active boolean DEFAULT true, is_free boolean DEFAULT false,
//   metadata jsonb DEFAULT '{}', created_at timestamptz DEFAULT now()
// );
// CREATE TABLE IF NOT EXISTS course_lessons (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
//   title text NOT NULL, content_url text, content_type text DEFAULT 'video',
//   order_index integer DEFAULT 0, is_preview boolean DEFAULT false,
//   duration_minutes integer, created_at timestamptz DEFAULT now()
// );
// CREATE TABLE IF NOT EXISTS course_enrollments (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
//   student_name text, student_email text NOT NULL,
//   status text DEFAULT 'active', progress_percent integer DEFAULT 0,
//   paid_amount numeric(10,2) DEFAULT 0, enrolled_at timestamptz DEFAULT now()
// );

import { useState, useEffect } from 'react';
import { GraduationCap, Plus, Edit2, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useEditorMode } from '@/lib/hooks/useEditorMode';
import type { BlockAdminProps } from '@/types/blocks';

interface Course {
  id: string; negocio_id: number; title: string; description: string;
  price: number; thumbnail_url: string | null; level: string;
  duration_hours: number | null; active: boolean; is_free: boolean;
  created_at: string;
}
interface Lesson {
  id: string; course_id: string; title: string; content_url: string | null;
  content_type: string; order_index: number; is_preview: boolean;
  duration_minutes: number | null;
}
interface Enrollment {
  id: string; course_id: string; student_name: string | null;
  student_email: string; status: string; progress_percent: number;
  paid_amount: number; enrolled_at: string;
}

const PRIMARY = '#577a2c';

const levelBadge: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-yellow-100 text-yellow-700',
  advanced: 'bg-red-100 text-red-700',
};
const levelLabel: Record<string, string> = {
  beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado',
};
const contentTypeLabel: Record<string, string> = {
  video: 'Video', text: 'Texto', pdf: 'PDF',
};

export default function AcademyAdmin({ negocio }: BlockAdminProps) {
  const supabase = createClient();
  const editorMode = useEditorMode();

  const [tab, setTab]             = useState<'cursos' | 'alumnos' | 'ingresos'>('cursos');
  const [courses, setCourses]     = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading]     = useState(true);

  // Estado modal curso
  const [showModal, setShowModal]       = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [saving, setSaving]             = useState(false);

  // Campos formulario curso
  const [fTitle, setFTitle]         = useState('');
  const [fDesc, setFDesc]           = useState('');
  const [fPrice, setFPrice]         = useState('');
  const [fIsFree, setFIsFree]       = useState(false);
  const [fLevel, setFLevel]         = useState('beginner');
  const [fDuration, setFDuration]   = useState('');
  const [fThumb, setFThumb]         = useState('');

  // Panel de lecciones
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [lessons, setLessons]       = useState<Lesson[]>([]);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lTitle, setLTitle]         = useState('');
  const [lUrl, setLUrl]             = useState('');
  const [lType, setLType]           = useState('video');
  const [lDuration, setLDuration]   = useState('');
  const [lPreview, setLPreview]     = useState(false);
  const [lOrder, setLOrder]         = useState('0');
  const [savingLesson, setSavingLesson] = useState(false);

  // Toast de error (reemplaza alert())
  const [toast, setToast]               = useState('');
  // ID de lección pendiente de confirmar eliminación (reemplaza confirm())
  const [lessonToDelete, setLessonToDelete] = useState<string | null>(null);

  // Filtro alumnos
  const [filterCourse, setFilterCourse] = useState('');

  useEffect(() => { loadData(); }, [negocio.id]);

  /** Muestra un mensaje de error breve y lo limpia después de 3 segundos */
  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  }

  /** Carga cursos y enrollments del negocio */
  async function loadData() {
    setLoading(true);
    const [{ data: c }, { data: e }] = await Promise.all([
      supabase
        .from('courses')
        .select('*, course_enrollments(count), course_lessons(count)')
        .eq('negocio_id', negocio.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('course_enrollments')
        .select('*, courses!inner(negocio_id)')
        .eq('courses.negocio_id', negocio.id)
        .order('enrolled_at', { ascending: false }),
    ]);
    if (c) setCourses(c as Course[]);
    if (e) setEnrollments(e as Enrollment[]);
    setLoading(false);
  }

  /** Abre modal para nuevo curso */
  function openNewModal() {
    setEditingCourse(null);
    setFTitle(''); setFDesc(''); setFPrice('0'); setFIsFree(false);
    setFLevel('beginner'); setFDuration(''); setFThumb('');
    setShowModal(true);
  }

  /** Abre modal precargado con datos del curso */
  function openEditModal(course: Course) {
    setEditingCourse(course);
    setFTitle(course.title); setFDesc(course.description || '');
    setFPrice(String(course.price)); setFIsFree(course.is_free);
    setFLevel(course.level); setFDuration(course.duration_hours != null ? String(course.duration_hours) : '');
    setFThumb(course.thumbnail_url || '');
    setShowModal(true);
  }

  /** Guarda (upsert) un curso */
  async function handleSaveCourse() {
    if (!fTitle.trim()) return;
    setSaving(true);
    try {
      const price = parseFloat(fPrice) || 0;
      const payload = {
        negocio_id: negocio.id, title: fTitle.trim(),
        description: fDesc.trim() || null, price,
        is_free: fIsFree || price === 0, level: fLevel,
        duration_hours: fDuration ? parseFloat(fDuration) : null,
        thumbnail_url: fThumb || null,
      };
      if (editingCourse) {
        const { error } = await supabase.from('courses').update(payload).eq('id', editingCourse.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('courses').insert({ ...payload, active: true });
        if (error) throw error;
      }
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      showToast('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  /** Activa / desactiva un curso */
  async function toggleActive(id: string, current: boolean) {
    const { error } = await supabase.from('courses').update({ active: !current }).eq('id', id);
    if (!error) setCourses(prev => prev.map(c => c.id === id ? { ...c, active: !current } : c));
    else showToast('Error: ' + error.message);
  }

  /** Abre el panel de lecciones para un curso */
  async function openLessons(courseId: string) {
    if (selectedCourseId === courseId) { setSelectedCourseId(null); return; }
    setSelectedCourseId(courseId);
    setShowLessonForm(false);
    const { data } = await supabase
      .from('course_lessons').select('*').eq('course_id', courseId)
      .order('order_index', { ascending: true });
    setLessons((data as Lesson[]) || []);
  }

  /** Guarda una lección nueva */
  async function handleSaveLesson() {
    if (!lTitle.trim() || !selectedCourseId) return;
    setSavingLesson(true);
    try {
      const { error } = await supabase.from('course_lessons').insert({
        course_id: selectedCourseId, title: lTitle.trim(),
        content_url: lUrl.trim() || null, content_type: lType,
        order_index: parseInt(lOrder) || 0,
        is_preview: lPreview,
        duration_minutes: lDuration ? parseInt(lDuration) : null,
      });
      if (error) throw error;
      setLTitle(''); setLUrl(''); setLType('video'); setLDuration(''); setLPreview(false); setLOrder('0');
      setShowLessonForm(false);
      await openLessons(selectedCourseId);
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setSavingLesson(false);
    }
  }

  /** Elimina una lección (requiere confirmación inline) */
  async function confirmDeleteLesson(id: string) {
    const { error } = await supabase.from('course_lessons').delete().eq('id', id);
    if (!error) {
      setLessons(prev => prev.filter(l => l.id !== id));
    } else {
      showToast('Error: ' + error.message);
    }
    setLessonToDelete(null);
  }

  // ── Cálculos de ingresos ────────────────────────────────────────────────────
  const totalIncome = enrollments.reduce((sum, e) => sum + e.paid_amount, 0);
  const filteredEnrollments = filterCourse
    ? enrollments.filter(e => e.course_id === filterCourse)
    : enrollments;

  return (
    <div className="max-w-4xl animate-in fade-in">

      {/* Toast de error */}
      {toast && (
        <div className="flex items-center justify-between gap-3 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span>{toast}</span>
          <button onClick={() => setToast('')} className="shrink-0 p-1 hover:bg-red-100 rounded-lg" aria-label="Cerrar">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap size={24} style={{ color: PRIMARY }} />
          Academia
        </h1>
        <p className="text-zinc-500 text-sm">Gestioná tus cursos, alumnos e ingresos.</p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-xl p-1 w-fit mb-6">
        {(['cursos', 'alumnos', 'ingresos'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all capitalize ${tab === t ? 'bg-white shadow text-zinc-900' : 'text-zinc-500'}`}>
            {t === 'cursos' ? `Cursos (${courses.length})` : t === 'alumnos' ? `Alumnos (${enrollments.length})` : 'Ingresos'}
          </button>
        ))}
      </div>

      {loading ? <p className="text-zinc-400 text-sm">Cargando...</p> : (
        <>
          {/* ── TAB CURSOS ──────────────────────────────────────────────── */}
          {tab === 'cursos' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-zinc-500">{courses.length} cursos registrados</p>
                <button onClick={openNewModal}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold hover:opacity-90 transition-all"
                  style={{ backgroundColor: PRIMARY }}>
                  <Plus size={16} /> Nuevo curso
                </button>
              </div>

              {courses.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
                  <GraduationCap size={40} className="mx-auto text-zinc-200 mb-3" />
                  <h3 className="text-lg font-bold text-zinc-900">Aun no creaste ningun curso</h3>
                </div>
              ) : (
                <div className="space-y-2">
                  {courses.map(course => {
                    const enrollCount = (course as any).course_enrollments?.[0]?.count ?? 0;
                    return (
                      <div key={course.id} className="bg-white border border-zinc-200 rounded-2xl shadow-sm overflow-hidden">
                        {/* Fila del curso */}
                        <div className="flex items-center gap-3 p-4">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-100 shrink-0 flex items-center justify-center">
                            {course.thumbnail_url
                              ? <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                              : <GraduationCap size={18} className="text-zinc-300" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-zinc-900 truncate">{course.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${levelBadge[course.level] || 'bg-zinc-100 text-zinc-500'}`}>
                                {levelLabel[course.level] || course.level}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {course.is_free ? 'Gratis' : `$${course.price.toLocaleString('es-AR')}`}
                              </span>
                              <span className="text-xs text-zinc-400">{enrollCount} alumnos</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => openLessons(course.id)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 flex items-center gap-1"
                              aria-label="Ver lecciones">
                              {selectedCourseId === course.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              Lecciones
                            </button>
                            <button
                              onClick={() => toggleActive(course.id, course.active)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${course.active ? 'bg-[#577a2c]' : 'bg-zinc-300'}`}
                              aria-label={course.active ? 'Desactivar' : 'Activar'}>
                              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${course.active ? 'translate-x-5' : 'translate-x-1'}`} />
                            </button>
                            <button onClick={() => openEditModal(course)}
                              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg"
                              aria-label="Editar curso">
                              <Edit2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Panel de lecciones inline */}
                        {selectedCourseId === course.id && (
                          <div className="border-t border-zinc-100 bg-zinc-50 p-4 space-y-3">
                            {lessons.length === 0 && !showLessonForm && (
                              <p className="text-xs text-zinc-400 text-center py-2">Sin lecciones aun</p>
                            )}
                            {lessons.map(lesson => (
                              <div key={lesson.id}>
                                <div className="flex items-center gap-3 bg-white rounded-xl p-3 border border-zinc-200">
                                  <span className="text-xs text-zinc-400 w-5 text-center">{lesson.order_index}</span>
                                  <span className="flex-1 text-sm font-medium text-zinc-800 truncate">{lesson.title}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700`}>
                                    {contentTypeLabel[lesson.content_type] || lesson.content_type}
                                  </span>
                                  {lesson.duration_minutes != null && (
                                    <span className="text-xs text-zinc-400">{lesson.duration_minutes}min</span>
                                  )}
                                  {lesson.is_preview && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Preview</span>
                                  )}
                                  <button onClick={() => setLessonToDelete(lesson.id)}
                                    className="p-1.5 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                                    aria-label="Eliminar leccion">
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                                {/* Confirmación inline de eliminación */}
                                {lessonToDelete === lesson.id && (
                                  <div className="flex items-center gap-2 mt-1 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs">
                                    <span className="flex-1 text-red-700 font-medium">¿Eliminar esta lección?</span>
                                    <button
                                      onClick={() => confirmDeleteLesson(lesson.id)}
                                      className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-colors">
                                      Confirmar
                                    </button>
                                    <button
                                      onClick={() => setLessonToDelete(null)}
                                      className="px-3 py-1 rounded-lg border border-zinc-300 text-zinc-600 font-bold hover:bg-zinc-100 transition-colors">
                                      Cancelar
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}

                            {/* Formulario nueva lección */}
                            {showLessonForm ? (
                              <div className="bg-white rounded-xl p-4 border border-zinc-200 space-y-3">
                                <input type="text" value={lTitle} onChange={e => setLTitle(e.target.value)}
                                  placeholder="Titulo de la leccion *"
                                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30" />
                                <input type="text" value={lUrl} onChange={e => setLUrl(e.target.value)}
                                  placeholder="URL del contenido"
                                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30" />
                                <div className="grid grid-cols-2 gap-2">
                                  <select value={lType} onChange={e => setLType(e.target.value)}
                                    className="p-2 border border-zinc-200 rounded-lg text-sm outline-none">
                                    <option value="video">Video</option>
                                    <option value="text">Texto</option>
                                    <option value="pdf">PDF</option>
                                  </select>
                                  <input type="number" value={lDuration} onChange={e => setLDuration(e.target.value)}
                                    placeholder="Duración (min)"
                                    className="p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30" />
                                </div>
                                <div className="flex items-center gap-4">
                                  <input type="number" value={lOrder} onChange={e => setLOrder(e.target.value)}
                                    placeholder="Orden"
                                    className="w-24 p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30" />
                                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input type="checkbox" checked={lPreview} onChange={e => setLPreview(e.target.checked)} className="rounded" />
                                    Es preview
                                  </label>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => setShowLessonForm(false)}
                                    className="flex-1 py-2 rounded-lg text-sm font-bold border border-zinc-200 hover:bg-zinc-50">
                                    Cancelar
                                  </button>
                                  <button onClick={handleSaveLesson} disabled={savingLesson || !lTitle.trim()}
                                    className="flex-1 py-2 rounded-lg text-white text-sm font-bold hover:opacity-90 disabled:opacity-50"
                                    style={{ backgroundColor: PRIMARY }}>
                                    {savingLesson ? 'Guardando...' : 'Guardar'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button onClick={() => setShowLessonForm(true)}
                                className="w-full py-2 rounded-xl border border-dashed border-zinc-300 text-xs text-zinc-500 hover:bg-white hover:border-zinc-400 transition-all flex items-center justify-center gap-1">
                                <Plus size={12} /> Agregar leccion
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB ALUMNOS ─────────────────────────────────────────────── */}
          {tab === 'alumnos' && (
            <div>
              <div className="mb-4">
                <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}
                  className="p-2 border border-zinc-200 rounded-lg text-sm outline-none">
                  <option value="">Todos los cursos</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              {filteredEnrollments.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-zinc-200">
                  <GraduationCap size={40} className="mx-auto text-zinc-200 mb-3" />
                  <h3 className="text-lg font-bold text-zinc-900">Sin alumnos aun</h3>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-2xl border border-zinc-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200">
                        {['Alumno', 'Curso', 'Progreso', 'Estado', 'Fecha'].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-xs font-bold text-zinc-400 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnrollments.map(e => {
                        const course = courses.find(c => c.id === e.course_id);
                        return (
                          <tr key={e.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                            <td className="py-3 px-4">
                              <p className="font-medium text-zinc-900">{e.student_name || 'Sin nombre'}</p>
                              <p className="text-xs text-zinc-400">{e.student_email}</p>
                            </td>
                            <td className="py-3 px-4 text-zinc-600 text-xs">{course?.title || '—'}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden min-w-[60px]">
                                  <div className="h-full rounded-full" style={{ width: `${e.progress_percent}%`, backgroundColor: PRIMARY }} />
                                </div>
                                <span className="text-xs text-zinc-400">{e.progress_percent}%</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 capitalize">
                                {e.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-zinc-400 text-xs whitespace-nowrap">
                              {new Date(e.enrolled_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── TAB INGRESOS ────────────────────────────────────────────── */}
          {tab === 'ingresos' && (
            <div className="space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Total cobrado', value: `$${totalIncome.toLocaleString('es-AR')}` },
                  { label: 'Alumnos totales', value: enrollments.length },
                  { label: 'Tasa de conv.', value: courses.length > 0 ? `${Math.round(enrollments.length / courses.length * 10) / 10}x` : '0x' },
                ].map(card => (
                  <div key={card.label} className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-sm">
                    <p className="text-xs text-zinc-400 font-bold uppercase mb-1">{card.label}</p>
                    <p className="text-2xl font-bold" style={{ color: PRIMARY }}>{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Tabla por curso */}
              <div className="bg-white rounded-2xl border border-zinc-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      {['Curso', 'Alumnos', 'Ingreso total', 'Promedio'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-bold text-zinc-400 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map(course => {
                      const courseEnrollments = enrollments.filter(e => e.course_id === course.id);
                      const total = courseEnrollments.reduce((s, e) => s + e.paid_amount, 0);
                      const avg = courseEnrollments.length > 0 ? Math.round(total / courseEnrollments.length) : 0;
                      return (
                        <tr key={course.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                          <td className="py-3 px-4 font-medium text-zinc-900">{course.title}</td>
                          <td className="py-3 px-4 text-zinc-600">{courseEnrollments.length}</td>
                          <td className="py-3 px-4 font-bold" style={{ color: PRIMARY }}>${total.toLocaleString('es-AR')}</td>
                          <td className="py-3 px-4 text-zinc-500">${avg.toLocaleString('es-AR')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MODAL NUEVO / EDITAR CURSO ───────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h2 className="font-bold text-lg">{editingCourse ? 'Editar curso' : 'Nuevo curso'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-zinc-100 rounded-lg" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">Titulo *</label>
                <input type="text" value={fTitle} onChange={e => setFTitle(e.target.value)}
                  placeholder="Ej: Marketing Digital desde cero"
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">Descripcion</label>
                <textarea value={fDesc} onChange={e => setFDesc(e.target.value)} rows={3}
                  placeholder="Descripcion del curso"
                  className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none resize-none focus:ring-2 focus:ring-[#577a2c]/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">Precio</label>
                  <input type="number" value={fPrice} onChange={e => { setFPrice(e.target.value); setFIsFree(parseFloat(e.target.value) === 0); }}
                    min={0} placeholder="0"
                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30" />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-1">Duracion (horas)</label>
                  <input type="number" value={fDuration} onChange={e => setFDuration(e.target.value)}
                    min={0} step={0.5} placeholder="Ej: 4.5"
                    className="w-full p-2 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#577a2c]/30" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase block mb-2">Nivel</label>
                <div className="flex gap-2">
                  {(['beginner', 'intermediate', 'advanced'] as const).map(lvl => (
                    <button key={lvl} onClick={() => setFLevel(lvl)}
                      className={`flex-1 py-2 text-xs border rounded-lg font-medium transition-all ${fLevel === lvl ? 'border-[#577a2c] bg-[#577a2c]/5 text-[#577a2c] font-bold' : 'bg-white text-zinc-500 border-zinc-200'}`}>
                      {levelLabel[lvl]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-zinc-400 uppercase">Es gratuito</label>
                <button onClick={() => setFIsFree(!fIsFree)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${fIsFree ? 'bg-[#577a2c]' : 'bg-zinc-300'}`}
                  aria-label={fIsFree ? 'Desactivar' : 'Activar'}>
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${fIsFree ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>
              <ImageUpload label="Thumbnail del curso" value={fThumb} onChange={setFThumb} />
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-zinc-100">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-zinc-200 hover:bg-zinc-50">
                Cancelar
              </button>
              <button onClick={handleSaveCourse} disabled={saving || !fTitle.trim()}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: PRIMARY }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
