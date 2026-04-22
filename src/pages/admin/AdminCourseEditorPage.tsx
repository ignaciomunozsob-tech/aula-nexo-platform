import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { generateSlug } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, ShieldCheck, ExternalLink } from 'lucide-react';
import CourseCoverUploader from '@/components/layout/CourseCoverUploader';

export default function AdminCourseEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const autoCreateRanRef = useRef(false);
  const [autoCreating, setAutoCreating] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    price_clp: 0,
    level: 'beginner',
    category_id: '',
    status: 'draft',
    format: 'recorded',
    instructor_name: '',
    instructor_bio: '',
    instructor_avatar_url: '',
  });

  // Auto-create draft so we have an id immediately (for cover upload)
  useEffect(() => {
    const run = async () => {
      if (!isNew || !user?.id || autoCreateRanRef.current) return;
      autoCreateRanRef.current = true;
      setAutoCreating(true);
      try {
        const tempSlug = `novu-draft-${Date.now().toString(36)}`;
        const { data, error } = await supabase
          .from('courses')
          .insert({
            title: 'Curso NOVU sin título',
            slug: tempSlug,
            creator_id: user.id,
            is_novu_official: true,
            status: 'draft',
            price_clp: 0,
            level: 'beginner',
          })
          .select()
          .single();
        if (error) throw error;
        navigate(`/admin/courses/${data.id}/edit`, { replace: true });
      } catch (e: any) {
        toast({
          title: 'Error creando curso',
          description: e?.message ?? 'Intenta nuevamente',
          variant: 'destructive',
        });
        autoCreateRanRef.current = false;
      } finally {
        setAutoCreating(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, user?.id]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('*').order('name');
      return data || [];
    },
  });

  const { data: course, isLoading } = useQuery({
    queryKey: ['admin-edit-course', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('courses').select('*').eq('id', id).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!course) return;
    setForm({
      title: course.title ?? '',
      description: course.description ?? '',
      price_clp: course.price_clp ?? 0,
      level: course.level ?? 'beginner',
      category_id: course.category_id ?? '',
      status: course.status ?? 'draft',
      format: course.format ?? 'recorded',
      instructor_name: course.instructor_name ?? '',
      instructor_bio: course.instructor_bio ?? '',
      instructor_avatar_url: course.instructor_avatar_url ?? '',
    });
  }, [course]);

  const saveMutation = useMutation({
    mutationFn: async (publish?: boolean) => {
      if (!id) throw new Error('No hay courseId');
      const payload: any = {
        title: form.title.trim() || 'Curso NOVU sin título',
        description: form.description,
        price_clp: Number(form.price_clp || 0),
        level: form.level,
        category_id: form.category_id || null,
        status: publish ? 'published' : form.status,
        format: form.format,
        instructor_name: form.instructor_name || null,
        instructor_bio: form.instructor_bio || null,
        instructor_avatar_url: form.instructor_avatar_url || null,
        is_novu_official: true,
        updated_at: new Date().toISOString(),
      };
      if (!course?.slug || course.slug.startsWith('novu-draft-')) {
        payload.slug = `${generateSlug(form.title || 'curso-novu')}-${Date.now().toString(36)}`;
      }
      const { error } = await supabase.from('courses').update(payload).eq('id', id);
      if (error) throw error;
      return { published: publish };
    },
    onSuccess: ({ published }) => {
      qc.invalidateQueries({ queryKey: ['admin-novu-courses'] });
      qc.invalidateQueries({ queryKey: ['admin-edit-course', id] });
      toast({
        title: published ? 'Curso publicado ✅' : 'Cambios guardados',
      });
      if (published) setForm((f) => ({ ...f, status: 'published' }));
    },
    onError: (e: any) => {
      toast({
        title: 'Error al guardar',
        description: e?.message,
        variant: 'destructive',
      });
    },
  });

  if ((autoCreating || isLoading) && !course) {
    return (
      <div className="p-8 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm text-muted-foreground">Cargando…</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/courses')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{form.title || 'Nuevo curso NOVU'}</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <ShieldCheck className="h-3 w-3" />
                NOVU Oficial
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {form.status === 'published' ? 'Publicado' : 'Borrador'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {form.status === 'published' && course?.slug && (
            <Button variant="outline" asChild>
              <Link to={`/course/${course.slug}`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver landing
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => saveMutation.mutate(false)}
            disabled={saveMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            Guardar borrador
          </Button>
          <Button
            onClick={() => saveMutation.mutate(true)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Publicar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del curso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej: Carrera de Marketing Digital"
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={6}
                  placeholder="Describe lo que aprenderá el estudiante…"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Categoría</Label>
                  <Select
                    value={form.category_id || 'none'}
                    onValueChange={(v) => setForm({ ...form, category_id: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin categoría</SelectItem>
                      {categories?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nivel</Label>
                  <Select
                    value={form.level}
                    onValueChange={(v) => setForm({ ...form, level: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Principiante</SelectItem>
                      <SelectItem value="intermediate">Intermedio</SelectItem>
                      <SelectItem value="advanced">Avanzado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Precio (CLP)</Label>
                  <Input
                    id="price"
                    type="number"
                    min={0}
                    value={form.price_clp}
                    onChange={(e) => setForm({ ...form, price_clp: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Formato</Label>
                  <Select
                    value={form.format}
                    onValueChange={(v) => setForm({ ...form, format: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recorded">Grabado</SelectItem>
                      <SelectItem value="live">En vivo</SelectItem>
                      <SelectItem value="hybrid">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instructor</CardTitle>
              <p className="text-sm text-muted-foreground">
                Profesor que aparecerá públicamente como autor del curso (ej: Ignacio Muñoz).
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="instructor_name">Nombre del instructor</Label>
                <Input
                  id="instructor_name"
                  value={form.instructor_name}
                  onChange={(e) => setForm({ ...form, instructor_name: e.target.value })}
                  placeholder="Ignacio Muñoz"
                />
              </div>
              <div>
                <Label htmlFor="instructor_bio">Bio corta</Label>
                <Textarea
                  id="instructor_bio"
                  value={form.instructor_bio}
                  onChange={(e) => setForm({ ...form, instructor_bio: e.target.value })}
                  rows={3}
                  placeholder="Especialista en marketing digital con +10 años…"
                />
              </div>
              <div>
                <Label htmlFor="instructor_avatar">Avatar del instructor (URL)</Label>
                <Input
                  id="instructor_avatar"
                  value={form.instructor_avatar_url}
                  onChange={(e) =>
                    setForm({ ...form, instructor_avatar_url: e.target.value })
                  }
                  placeholder="https://…"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Módulos y lecciones</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Para gestionar módulos y lecciones del curso, abre el editor completo.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate(`/creator-app/courses/${id}/edit`)}
              >
                Abrir editor de contenido →
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Imagen de portada</CardTitle>
            </CardHeader>
            <CardContent>
              {id && (
                <CourseCoverUploader
                  courseId={id}
                  currentUrl={course?.cover_image_url}
                  onUploaded={() => qc.invalidateQueries({ queryKey: ['admin-edit-course', id] })}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
