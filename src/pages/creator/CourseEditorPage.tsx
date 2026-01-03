import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { generateSlug } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, Save } from 'lucide-react';
import CourseCoverUploader from '@/components/layout/CourseCoverUploader';

type LessonForm = {
  id: string;
  title: string;
  type: 'video' | 'text';
  video_url?: string | null;
  content_text?: string | null;
};

type ModuleForm = {
  id: string;
  title: string;
  lessons: LessonForm[];
};

export default function CourseEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: '',
    description: '',
    price_clp: 0,
    level: 'beginner',
    category_id: '',
    status: 'draft',
  });

  const [modules, setModules] = useState<ModuleForm[]>([]);
  const [deletedModuleIds, setDeletedModuleIds] = useState<string[]>([]);
  const [deletedLessonIds, setDeletedLessonIds] = useState<string[]>([]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: course, isLoading } = useQuery({
    queryKey: ['edit-course', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  const { data: existingModules } = useQuery({
    queryKey: ['edit-modules', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select('*, lessons(*)')
        .eq('course_id', id)
        .order('order_index');

      if (error) throw error;

      return (
        data?.map((m: any) => ({
          ...m,
          lessons: ((m.lessons as any[]) || []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
        })) || []
      );
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (course) {
      setForm({
        title: course.title,
        description: course.description || '',
        price_clp: course.price_clp ?? 0,
        level: course.level || 'beginner',
        category_id: course.category_id || '',
        status: course.status || 'draft',
      });
    }
    if (existingModules) {
      setModules(existingModules as any);
      setDeletedModuleIds([]);
      setDeletedLessonIds([]);
    }
  }, [course, existingModules]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Debes iniciar sesión');

      const nowIso = new Date().toISOString();

      // slug solo para curso nuevo (y único)
      const slug = `${generateSlug(form.title)}-${Date.now().toString(36)}`;

      let courseId = id as string | undefined;

      if (isNew) {
        const { data, error } = await supabase
          .from('courses')
          .insert({
            ...form,
            slug,
            creator_id: user.id,
            category_id: form.category_id || null,
            published_at: form.status === 'published' ? nowIso : null,
          })
          .select()
          .single();

        if (error) throw error;
        courseId = data.id;
      } else {
        const payload: any = {
          ...form,
          category_id: form.category_id || null,
        };

        // si se publica por primera vez, setea published_at (si ya existía, no lo pisa)
        if (form.status === 'published' && !course?.published_at) payload.published_at = nowIso;
        // si vuelve a draft, opcional: dejar published_at como estaba (MVP). Si quieres limpiarlo: payload.published_at = null;

        const { error } = await supabase.from('courses').update(payload).eq('id', id);
        if (error) throw error;
      }

      if (!courseId) throw new Error('No se pudo determinar courseId');

      // 1) aplicar deletes (primero lessons, después modules)
      if (deletedLessonIds.length > 0) {
        const ids = deletedLessonIds.filter((x) => !x.startsWith('new-'));
        if (ids.length > 0) {
          const { error } = await supabase.from('lessons').delete().in('id', ids);
          if (error) throw error;
        }
      }

      if (deletedModuleIds.length > 0) {
        const ids = deletedModuleIds.filter((x) => !x.startsWith('new-'));
        if (ids.length > 0) {
          const { error } = await supabase.from('course_modules').delete().in('id', ids);
          if (error) throw error;
        }
      }

      // 2) upsert modules + lessons (con order_index)
      for (let mi = 0; mi < modules.length; mi++) {
        const mod = modules[mi];
        let moduleId = mod.id;

        if (mod.id?.startsWith('new-')) {
          const { data, error } = await supabase
            .from('course_modules')
            .insert({ course_id: courseId, title: mod.title, order_index: mi })
            .select()
            .single();
          if (error) throw error;
          moduleId = data.id;
        } else {
          const { error } = await supabase
            .from('course_modules')
            .update({ title: mod.title, order_index: mi })
            .eq('id', mod.id);
          if (error) throw error;
        }

        for (let li = 0; li < (mod.lessons || []).length; li++) {
          const les = mod.lessons[li];

          if (les.id?.startsWith('new-')) {
            const { error } = await supabase.from('lessons').insert({
              module_id: moduleId,
              title: les.title,
              type: les.type,
              video_url: les.type === 'video' ? (les.video_url || null) : null,
              content_text: les.type === 'text' ? (les.content_text || null) : null,
              order_index: li,
            });
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('lessons')
              .update({
                title: les.title,
                type: les.type,
                video_url: les.type === 'video' ? (les.video_url || null) : null,
                content_text: les.type === 'text' ? (les.content_text || null) : null,
                order_index: li,
              })
              .eq('id', les.id);
            if (error) throw error;
          }
        }
      }

      return courseId;
    },

    onSuccess: (courseId) => {
      queryClient.invalidateQueries({ queryKey: ['creator-courses'] });
      queryClient.invalidateQueries({ queryKey: ['edit-course', courseId] });
      queryClient.invalidateQueries({ queryKey: ['edit-modules', courseId] });

      toast({ title: 'Curso guardado ✅' });

      if (isNew) navigate(`/creator-app/courses/${courseId}/edit`);
    },

    onError: (e: any) => {
      toast({ title: 'Error', description: e?.message ?? 'Error guardando', variant: 'destructive' });
    },
  });

  const addModule = () =>
    setModules([
      ...modules,
      {
        id: `new-${Date.now()}`,
        title: 'Nuevo módulo',
        lessons: [],
      },
    ]);

  const deleteModule = (mi: number) => {
    const mod = modules[mi];
    const next = [...modules];
    next.splice(mi, 1);
    setModules(next);

    if (mod?.id && !mod.id.startsWith('new-')) {
      setDeletedModuleIds((prev) => [...prev, mod.id]);
      const lessonIds = (mod.lessons || []).map((l) => l.id).filter((x) => x && !x.startsWith('new-'));
      if (lessonIds.length) setDeletedLessonIds((prev) => [...prev, ...lessonIds]);
    }
  };

  const addLesson = (mi: number) => {
    const updated = [...modules];
    updated[mi].lessons = [
      ...(updated[mi].lessons || []),
      { id: `new-${Date.now()}`, title: 'Nueva lección', type: 'video', video_url: '', content_text: '' },
    ];
    setModules(updated);
  };

  const deleteLesson = (mi: number, li: number) => {
    const updated = [...modules];
    const les = updated[mi].lessons[li];
    updated[mi].lessons.splice(li, 1);
    setModules(updated);

    if (les?.id && !les.id.startsWith('new-')) setDeletedLessonIds((prev) => [...prev, les.id]);
  };

  if (!isNew && isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">{isNew ? 'Nuevo Curso' : 'Editar Curso'}</h1>

      <div className="space-y-6">
        <div className="bg-card border rounded-lg p-6 space-y-4">
          {/* ✅ Portada */}
          <div className="space-y-2">
            <Label>Portada del curso</Label>
            {isNew ? (
              <div className="text-sm text-muted-foreground">
                Guarda el curso primero para poder subir la portada.
              </div>
            ) : (
              <CourseCoverUploader
                courseId={id!}
                currentUrl={course?.cover_image_url}
                onUploaded={() => {
                  queryClient.invalidateQueries({ queryKey: ['edit-course', id] });
                  queryClient.invalidateQueries({ queryKey: ['creator-courses'] });
                }}
              />
            )}
          </div>

          <div>
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
          </div>

          <div>
            <Label>Descripción</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" />
          </div>

          {/* ✅ Categoría */}
          <div>
            <Label>Categoría</Label>
            <Select
              value={form.category_id || 'none'}
              onValueChange={(v) => setForm({ ...form, category_id: v === 'none' ? '' : v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {(categories || []).map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Precio CLP</Label>
              <Input
                type="number"
                value={form.price_clp}
                onChange={(e) => setForm({ ...form, price_clp: Number(e.target.value || 0) })}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Nivel</Label>
              <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Principiante</SelectItem>
                  <SelectItem value="intermediate">Intermedio</SelectItem>
                  <SelectItem value="advanced">Avanzado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Módulos y Lecciones</h2>
            <Button variant="outline" size="sm" onClick={addModule}>
              <Plus className="h-4 w-4 mr-1" />
              Módulo
            </Button>
          </div>

          <div className="space-y-4">
            {modules.map((mod, mi) => (
              <div key={mod.id} className="border rounded-lg p-4">
                <div className="flex gap-2 mb-3 items-center">
                  <Input
                    value={mod.title}
                    onChange={(e) => {
                      const u = [...modules];
                      u[mi].title = e.target.value;
                      setModules(u);
                    }}
                    className="flex-1"
                    placeholder="Título del módulo"
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={mi === 0}
                    onClick={() => {
                      const u = [...modules];
                      [u[mi], u[mi - 1]] = [u[mi - 1], u[mi]];
                      setModules(u);
                    }}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={mi === modules.length - 1}
                    onClick={() => {
                      const u = [...modules];
                      [u[mi], u[mi + 1]] = [u[mi + 1], u[mi]];
                      setModules(u);
                    }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>

                  <Button variant="ghost" size="icon" onClick={() => deleteModule(mi)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  {(mod.lessons || []).map((les, li) => (
                    <div key={les.id} className="flex gap-2 items-start bg-muted/30 p-2 rounded">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={les.title}
                          onChange={(e) => {
                            const u = [...modules];
                            u[mi].lessons[li].title = e.target.value;
                            setModules(u);
                          }}
                          placeholder="Título lección"
                        />

                        <Select
                          value={les.type}
                          onValueChange={(v) => {
                            const u = [...modules];
                            u[mi].lessons[li].type = v as any;

                            // limpieza automática al cambiar tipo
                            if (v === 'video') u[mi].lessons[li].content_text = '';
                            if (v === 'text') u[mi].lessons[li].video_url = '';

                            setModules(u);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="video">Video</SelectItem>
                            <SelectItem value="text">Texto</SelectItem>
                          </SelectContent>
                        </Select>

                        {les.type === 'video' && (
                          <Input
                            value={les.video_url || ''}
                            onChange={(e) => {
                              const u = [...modules];
                              u[mi].lessons[li].video_url = e.target.value;
                              setModules(u);
                            }}
                            placeholder="URL del video (YouTube)"
                          />
                        )}

                        {les.type === 'text' && (
                          <Textarea
                            value={les.content_text || ''}
                            onChange={(e) => {
                              const u = [...modules];
                              u[mi].lessons[li].content_text = e.target.value;
                              setModules(u);
                            }}
                            placeholder="Contenido"
                          />
                        )}
                      </div>

                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={li === 0}
                          onClick={() => {
                            const u = [...modules];
                            [u[mi].lessons[li], u[mi].lessons[li - 1]] = [u[mi].lessons[li - 1], u[mi].lessons[li]];
                            setModules(u);
                          }}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={li === (mod.lessons?.length || 0) - 1}
                          onClick={() => {
                            const u = [...modules];
                            [u[mi].lessons[li], u[mi].lessons[li + 1]] = [u[mi].lessons[li + 1], u[mi].lessons[li]];
                            setModules(u);
                          }}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>

                        <Button variant="ghost" size="icon" onClick={() => deleteLesson(mi, li)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button variant="ghost" size="sm" onClick={() => addLesson(mi)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Lección
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="lg">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar Curso
        </Button>
      </div>
    </div>
  );
}
