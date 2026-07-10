import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { generateSlug, getCourseUrl } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Loader2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Save,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Users,
  BookOpen,
  Settings,
  Star,
  CreditCard,
  MessagesSquare,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CourseCoverUploader from "@/components/layout/CourseCoverUploader";
import LessonVideoUploader from "@/components/layout/LessonVideoUploader";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import LessonResourcesEditor from "@/components/layout/LessonResourcesEditor";
import ModuleResourcesEditor from "@/components/creator/ModuleResourcesEditor";
import StudentManagement from "@/components/creator/StudentManagement";
import CertificateTemplateUploader from "@/components/creator/CertificateTemplateUploader";
import CourseCommunityManager from "@/components/creator/CourseCommunityManager";
import CreatorReviewsPage from "@/pages/creator/CreatorReviewsPage";
import CheckoutPagesPage from "@/pages/creator/CheckoutPagesPage";


type LessonResourceForm = {
  id: string;
  file_url: string;
  file_name: string;
};

type LessonForm = {
  id: string;
  title: string;
  type: "video" | "text";
  video_url?: string | null;
  content_text?: string | null;
  description?: string | null;
  resources?: LessonResourceForm[];
};

type ModuleForm = {
  id: string;
  title: string;
  lessons: LessonForm[];
};



/**
 * Editor enriquecido liviano (sin deps):
 * - contentEditable + toolbar con execCommand
 * - guarda HTML en description_html
 */
// RichTextEditor moved to src/components/editor/RichTextEditor.tsx

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// StudentManagement component is now imported from separate file

export default function CourseEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // evita doble creación en StrictMode
  const autoCreateRanRef = useRef(false);
  const [autoCreating, setAutoCreating] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description_html: "",
    price_clp: 0,
    level: "beginner",
    category_id: "",
    status: "draft",
    format: "recorded",
    certificate_enabled: false,
    certificate_template_url: "",
    community_enabled: false,
  });

  const [modules, setModules] = useState<ModuleForm[]>([]);
  const [deletedModuleIds, setDeletedModuleIds] = useState<string[]>([]);
  const [deletedLessonIds, setDeletedLessonIds] = useState<string[]>([]);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Refs para comparar cambios
  const initialFormRef = useRef<typeof form | null>(null);
  const initialModulesRef = useRef<ModuleForm[] | null>(null);

  // auto-create para tener id al tiro (portada inmediata)
  useEffect(() => {
    const autoCreate = async () => {
      if (!isNew) return;
      if (!user?.id) return;
      if (autoCreateRanRef.current) return;

      autoCreateRanRef.current = true;
      setAutoCreating(true);

      try {
        const tempTitle = "Curso sin título";
        const tempSlug = `draft-${user.id}-${Date.now().toString(36)}`;

        const { data, error } = await supabase
          .from("courses")
          .insert({
            title: tempTitle,
            slug: tempSlug,
            creator_id: user.id,
            description: "",
            price_clp: 0,
            level: "beginner",
            status: "draft",
            category_id: null,
          })
          .select()
          .single();

        if (error) throw error;

        navigate(`/creator-app/courses/${data.id}/edit`, { replace: true });
      } catch (e: any) {
        toast({
          title: "Error creando curso",
          description: e?.message ?? "Intenta nuevamente",
          variant: "destructive",
        });
        autoCreateRanRef.current = false;
      } finally {
        setAutoCreating(false);
      }
    };

    autoCreate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, user?.id]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: course, isLoading: isLoadingCourse } = useQuery({
    queryKey: ["edit-course", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("*").eq("id", id).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: existingModules, isLoading: isLoadingModules } = useQuery({
    queryKey: ["edit-modules", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_modules")
        .select(`
          id, course_id, title, order_index, created_at,
          lessons(
            id, module_id, title, order_index, type, content_text, duration_minutes, created_at, description,
            lesson_resources(id, lesson_id, file_name, created_at)
          )
        `)
        .eq("course_id", id)
        .order("order_index");
      if (error) throw error;

      // video_url / file_url are hidden from regular SELECT; fetch via SECURITY DEFINER RPC.
      const { data: paths } = await supabase.rpc("get_course_editor_paths", { _course_id: id! });
      const videoByLesson = new Map<string, string | null>();
      const fileByResource = new Map<string, string | null>();
      for (const row of (paths as any[]) || []) {
        if (row.lesson_id) videoByLesson.set(row.lesson_id, row.video_url ?? null);
        if (row.resource_id) fileByResource.set(row.resource_id, row.resource_file_url ?? null);
      }

      return (
        data?.map((m: any) => ({
          ...m,
          lessons: ((m.lessons as any[]) || [])
            .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
            .map((l: any) => ({
              ...l,
              video_url: videoByLesson.get(l.id) ?? l.video_url ?? null,
              resources: ((l.lesson_resources as any[]) || []).map((r: any) => ({
                ...r,
                file_url: fileByResource.get(r.id) ?? r.file_url ?? "",
              })),
            })),
        })) || []
      );
    },
    enabled: !!id,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000,
  });

  // cargar curso
  // Initialize form ONLY the first time the course loads (or after a save resets the flag).
  // Otherwise a background refetch would wipe the creator's in-progress edits and leave the
  // "Guardar Cambios" button disabled because hasChanges would be reset to false.
  useEffect(() => {
    if (!course) return;
    if (initialFormRef.current) return; // already initialized

    const initialForm = {
      title: course.title ?? "",
      description_html: course.description ?? "",
      price_clp: course.price_clp ?? 0,
      level: course.level ?? "beginner",
      category_id: course.category_id ?? "",
      status: course.status ?? "draft",
      format: (course as any).format ?? "recorded",
      certificate_enabled: !!(course as any).certificate_enabled,
      certificate_template_url: (course as any).certificate_template_url ?? "",
      community_enabled: !!(course as any).community_enabled,
    };

    setForm(initialForm);
    initialFormRef.current = initialForm;
  }, [course]);

  useEffect(() => {
    if (!existingModules) return;
    if (initialModulesRef.current) return; // already initialized
    setModules(existingModules as any);
    initialModulesRef.current = JSON.parse(JSON.stringify(existingModules));
    setDeletedModuleIds([]);
    setDeletedLessonIds([]);
    setHasChanges(false);
  }, [existingModules]);

  // Detectar cambios
  useEffect(() => {
    if (!initialFormRef.current || !initialModulesRef.current) return;
    
    const formChanged = JSON.stringify(form) !== JSON.stringify(initialFormRef.current);
    const modulesChanged = JSON.stringify(modules) !== JSON.stringify(initialModulesRef.current);
    const hasDeletes = deletedModuleIds.length > 0 || deletedLessonIds.length > 0;
    
    setHasChanges(formChanged || modulesChanged || hasDeletes);
  }, [form, modules, deletedModuleIds, deletedLessonIds]);

  const saveMutation = useMutation({
    mutationFn: async (override?: Partial<typeof form>) => {
      if (!user?.id) throw new Error("Debes iniciar sesión");
      if (!id) throw new Error("No se pudo determinar courseId");

      const nowIso = new Date().toISOString();
      const nextForm = { ...form, ...(override || {}) };

      const payload: any = {
        title: (nextForm.title || "").trim(),
        description: nextForm.description_html || "",
        price_clp: Number(nextForm.price_clp || 0),
        level: nextForm.level,
        category_id: nextForm.category_id || null,
        status: nextForm.status,
        format: nextForm.format,
        certificate_enabled: nextForm.certificate_enabled,
        certificate_template_url: nextForm.certificate_enabled
          ? nextForm.certificate_template_url || null
          : null,
        community_enabled: nextForm.community_enabled,
        updated_at: nowIso,
      };

      // Regenerate slug from title if missing or still a temporary draft slug
      if (!course?.slug || course.slug.startsWith("draft-")) {
        payload.slug = `${generateSlug(nextForm.title || "curso")}-${Date.now().toString(36).slice(-4)}`;
      }

      // 1. Actualización directa
      const { error } = await supabase.from("courses").update(payload).eq("id", id);
      if (error) throw error;

      // 2. Eliminaciones (Lessons)
      if (deletedLessonIds.length > 0) {
        const ids = deletedLessonIds.filter((x) => x && !x.startsWith("new-"));
        if (ids.length > 0) {
          const { error: delLessErr } = await supabase.from("lessons").delete().in("id", ids);
          if (delLessErr) throw delLessErr;
        }
      }

      // 3. Eliminaciones (Modules)
      if (deletedModuleIds.length > 0) {
        const ids = deletedModuleIds.filter((x) => x && !x.startsWith("new-"));
        if (ids.length > 0) {
          const { error: delModErr } = await supabase.from("course_modules").delete().in("id", ids);
          if (delModErr) throw delModErr;
        }
      }

      // 4. Guardar Módulos y Lecciones (Upsert)
      for (let mi = 0; mi < modules.length; mi++) {
        const mod = modules[mi];
        let moduleId = mod.id;

        if (mod.id?.startsWith("new-")) {
          const { data, error } = await supabase
            .from("course_modules")
            .insert({ course_id: id, title: mod.title, order_index: mi })
            .select()
            .single();
          if (error) throw error;
          moduleId = data.id;
        } else {
          const { error } = await supabase
            .from("course_modules")
            .update({ title: mod.title, order_index: mi })
            .eq("id", mod.id);
          if (error) throw error;
        }

        for (let li = 0; li < (mod.lessons || []).length; li++) {
          const les = mod.lessons[li];
          const lessonPayload: any = {
            title: les.title,
            type: les.type,
            video_url: les.type === "video" ? (les.video_url || null) : null,
            content_text: les.type === "text" ? (les.content_text || null) : null,
            description: les.description || null,
            order_index: li,
            module_id: moduleId,
          };

          let lessonId = les.id;
          if (les.id?.startsWith("new-")) {
            const { data: newLes, error } = await supabase
              .from("lessons")
              .insert(lessonPayload)
              .select("id")
              .single();
            if (error) throw error;
            lessonId = newLes.id;
          } else {
            const { error } = await supabase
              .from("lessons")
              .update(lessonPayload)
              .eq("id", les.id);
            if (error) throw error;
          }

          // Sincronizar recursos: borra todos y reinserta los actuales
          const { error: delResErr } = await supabase
            .from("lesson_resources")
            .delete()
            .eq("lesson_id", lessonId);
          if (delResErr) throw delResErr;

          const validResources = (les.resources || []).filter(
            (r) => r.file_url && r.file_url.trim() !== ""
          );
          if (validResources.length > 0) {
            const { error: insResErr } = await supabase.from("lesson_resources").insert(
              validResources.map((r) => ({
                lesson_id: lessonId,
                file_url: r.file_url,
                file_name: r.file_name || r.file_url,
              }))
            );
            if (insResErr) throw insResErr;
          }
        }
      }

      return { id, savedForm: nextForm };
    },
    onSuccess: ({ id: courseId, savedForm }) => {
      const needsModuleRehydrate = modules.some(
        (m) =>
          m.id?.startsWith("new-") ||
          (m.lessons || []).some(
            (l) =>
              l.id?.startsWith("new-") ||
              (l.resources || []).some((r) => r.id?.startsWith("new-")),
          ),
      );

      setHasChanges(false);
      initialFormRef.current = { ...savedForm };
      initialModulesRef.current = needsModuleRehydrate ? null : JSON.parse(JSON.stringify(modules));
      setDeletedModuleIds([]);
      setDeletedLessonIds([]);

      queryClient.invalidateQueries({ queryKey: ["creator-courses"] });
      queryClient.invalidateQueries({ queryKey: ["edit-course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["edit-modules", courseId] });

      toast({ title: "Curso guardado correctamente ✅" });
    },
    onError: (e: any) => {
      console.error("Save error:", e);
      const raw = (e?.message || "") as string;
      let title = "Error al guardar";
      let description = raw || "Revisa tu conexión o intenta nuevamente";
      if (raw.includes("mercadopago_not_connected")) {
        title = "Conecta MercadoPago";
        description = "Para publicar un producto con precio debes conectar tu cuenta de MercadoPago primero.";
      } else if (raw.includes("plan_limit_courses_gratis")) {
        title = "Límite del Plan Gratis";
        description = "Tu Plan Gratis permite máximo 2 cursos publicados. Mejora tu plan en /precios para publicar más.";
      }
      toast({ title, description, variant: "destructive" });
    },
  });

  const handleSave = (override?: Partial<typeof form>) => {
    const nextForm = { ...form, ...(override || {}) };
    if (!(nextForm.title || "").trim()) {
      toast({ title: "Título requerido", description: "Agrega un título antes de guardar.", variant: "destructive" });
      return;
    }
    saveMutation.mutate(override);
  };

  const addModule = () => setModules([...modules, { id: `new-${Date.now()}`, title: "Nuevo módulo", lessons: [] }]);

  const deleteModule = (mi: number) => {
    const mod = modules[mi];
    const next = [...modules];
    next.splice(mi, 1);
    setModules(next);

    if (mod?.id && !mod.id.startsWith("new-")) {
      setDeletedModuleIds((prev) => [...prev, mod.id]);

      const lessonIds = (mod.lessons || [])
        .map((l) => l.id)
        .filter((x) => x && !x.startsWith("new-"));

      if (lessonIds.length) setDeletedLessonIds((prev) => [...prev, ...lessonIds]);
    }
  };

  const addLesson = (mi: number) => {
    const updated = [...modules];
    updated[mi].lessons = [
      ...(updated[mi].lessons || []),
      { id: `new-${Date.now()}`, title: "Nueva lección", type: "video", video_url: "", content_text: "", description: "", resources: [] },
    ];
    setModules(updated);
  };

  const deleteLesson = (mi: number, li: number) => {
    const updated = [...modules];
    const les = updated[mi].lessons[li];
    updated[mi].lessons.splice(li, 1);
    setModules(updated);

    if (les?.id && !les.id.startsWith("new-")) setDeletedLessonIds((prev) => [...prev, les.id]);
  };

  const loading = autoCreating || isLoadingCourse || isLoadingModules;
  const canSaveCourse = !saveMutation.isPending && !!(form.title || "").trim();

  if (loading && !id) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex justify-center items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm text-muted-foreground">Creando curso…</span>
      </div>
    );
  }

  if (loading && id) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 sm:p-6 lg:p-8 max-w-4xl">
      {/* Diálogo de confirmación para publicar */}
      <AlertDialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de publicar este curso?</AlertDialogTitle>
            <AlertDialogDescription>
              Una vez publicado, el curso será visible para todos los usuarios. Puedes cambiarlo a borrador en cualquier momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setForm((prev) => ({ ...prev, status: "published" }));
                handleSave({ status: "published" });
              }}
            >
              Sí, publicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Editar Curso</h1>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {course?.id && (
            <>
              <Button variant="outline" className="w-full sm:w-auto" asChild>
                <a href={`${window.location.origin}${getCourseUrl(profile?.creator_slug, course.slug)}`} target="_blank" rel="noreferrer">
                  <Link2 className="h-4 w-4 mr-2" />
                  Ver página pública
                </a>
              </Button>
              <Button variant="outline" className="w-full sm:w-auto" asChild>
                <a href={`${window.location.origin}/preview/course/${course.id}?preview=true`} target="_blank" rel="noreferrer">
                  <Users className="h-4 w-4 mr-2" />
                  Vista previa alumno
                </a>
              </Button>
            </>
          )}
          {course?.status === "draft" ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => handleSave()} 
                disabled={!canSaveCourse}
                className="w-full sm:w-auto"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar Borrador
              </Button>
              <Button onClick={() => setShowPublishDialog(true)} disabled={!canSaveCourse} className="w-full sm:w-auto">
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar y Publicar
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => handleSave()} 
              disabled={!canSaveCourse}
              className="w-full sm:w-auto"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar Cambios
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="info" className="w-full">
        <TabsList className="flex flex-wrap w-full gap-1 h-auto mb-6">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Información
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Módulos
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Alumnos
          </TabsTrigger>
          <TabsTrigger value="community" className="flex items-center gap-2">
            <MessagesSquare className="h-4 w-4" />
            Comunidad
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Evaluaciones
          </TabsTrigger>
          <TabsTrigger value="checkout" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Páginas de pago
          </TabsTrigger>
        </TabsList>

        {/* Tab: Información del Curso */}
        <TabsContent value="info" className="space-y-6">
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <Label>Portada del curso</Label>
              {id ? (
                <CourseCoverUploader
                  courseId={id}
                  currentUrl={course?.cover_image_url}
                  onUploaded={() => {
                    queryClient.invalidateQueries({ queryKey: ["edit-course", id] });
                    queryClient.invalidateQueries({ queryKey: ["creator-courses"] });
                  }}
                />
              ) : (
                <div className="text-sm text-muted-foreground">Creando curso…</div>
              )}
            </div>

            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
            </div>

            <div>
              <Label>Descripción (texto enriquecido)</Label>
              <div className="mt-1">
                <RichTextEditor
                  value={form.description_html}
                  onChange={(html) => setForm((p) => ({ ...p, description_html: html }))}
                />
              </div>
            </div>

            <div>
              <Label>Categoría</Label>
              <Select
                value={form.category_id || "none"}
                onValueChange={(v) => setForm({ ...form, category_id: v === "none" ? "" : v })}
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <Label>Formato</Label>
                <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recorded">Grabado</SelectItem>
                    <SelectItem value="live">En vivo</SelectItem>
                    <SelectItem value="hybrid">Híbrido</SelectItem>
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

          {/* Certificado (opcional) */}
          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold">Certificado al finalizar</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Opcional. Si lo activas, el alumno recibirá un certificado al
                  completar el curso. Puedes subir una plantilla editable.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={form.certificate_enabled}
                  onChange={(e) =>
                    setForm({ ...form, certificate_enabled: e.target.checked })
                  }
                />
                <span className="text-sm font-medium">
                  {form.certificate_enabled ? "Activado" : "Desactivado"}
                </span>
              </label>
            </div>

            {form.certificate_enabled && id && (
              <div className="pt-2">
                <Label>Plantilla del certificado</Label>
                <div className="mt-1">
                  <CertificateTemplateUploader
                    courseId={id}
                    currentUrl={form.certificate_template_url || null}
                    onUrlChange={(url) =>
                      setForm({ ...form, certificate_template_url: url })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <Button 
            onClick={() => handleSave()} 
            disabled={!canSaveCourse} 
            size="lg" 
            className="w-full"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Cambios
          </Button>
        </TabsContent>

        {/* Tab: Módulos y Lecciones */}
        <TabsContent value="modules" className="space-y-6">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold">Módulos y Lecciones</h2>
              <Button variant="outline" size="sm" onClick={addModule}>
                <Plus className="h-4 w-4 mr-1" />
                Módulo
              </Button>
            </div>

            <div className="space-y-3">
              {modules.map((mod, mi) => {
                // Colores alternados suaves para cada módulo
                const bgColors = [
                  "bg-blue-50/50 dark:bg-blue-950/20",
                  "bg-green-50/50 dark:bg-green-950/20",
                  "bg-purple-50/50 dark:bg-purple-950/20",
                  "bg-orange-50/50 dark:bg-orange-950/20",
                  "bg-pink-50/50 dark:bg-pink-950/20",
                  "bg-cyan-50/50 dark:bg-cyan-950/20",
                ];
                const bgColor = bgColors[mi % bgColors.length];

                return (
                  <Collapsible key={mod.id} defaultOpen={mod.id?.startsWith("new-")}>
                    <div className={`border rounded-lg overflow-hidden ${bgColor}`}>
                      {/* Header del módulo */}
                      <div className="flex items-center gap-2 p-3">
                        <CollapsibleTrigger className="flex items-center gap-2 flex-1 hover:bg-black/5 dark:hover:bg-white/5 rounded p-1 -m-1 transition-colors">
                          <ChevronRight className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-90" />
                          <span className="text-xs text-muted-foreground font-medium">
                            Módulo {mi + 1}
                          </span>
                        </CollapsibleTrigger>
                        
                        <Input
                          value={mod.title}
                          onChange={(e) => {
                            const u = [...modules];
                            if (u[mi]) {
                              u[mi].title = e.target.value;
                              setModules(u);
                            }
                          }}
                          className="flex-1 font-bold bg-background"
                          placeholder="Título del módulo"
                        />

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={mi === 0}
                            onClick={() => {
                              const u = [...modules];
                              [u[mi], u[mi - 1]] = [u[mi - 1], u[mi]];
                              setModules(u);
                            }}
                            title="Subir módulo"
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
                            title="Bajar módulo"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => deleteModule(mi)}
                            className="text-destructive hover:text-destructive"
                            title="Eliminar módulo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Contenido colapsable - Lecciones */}
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-1">
                          <div className="space-y-2 pl-4 border-l-2 border-primary/30">
                            {(mod.lessons || []).map((les, li) => (
                              <Collapsible key={les.id} defaultOpen={les.id?.startsWith("new-")}>
                                <div className="bg-background/80 rounded-lg shadow-sm overflow-hidden">
                                  {/* Header de la lección - siempre visible */}
                                  <div className="flex items-center gap-2 p-3">
                                    <CollapsibleTrigger className="flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 rounded p-1 -m-1 transition-colors">
                                      <ChevronRight className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-90" />
                                      <span className="text-xs text-muted-foreground font-medium">
                                        Lección {li + 1}
                                      </span>
                                    </CollapsibleTrigger>
                                    
                                    <Input
                                      value={les.title}
                                      onChange={(e) => {
                                        const u = [...modules];
                                        if (u[mi]?.lessons?.[li]) {
                                          u[mi].lessons[li].title = e.target.value;
                                          setModules(u);
                                        }
                                      }}
                                      placeholder="Título de la lección"
                                      className="flex-1 font-medium"
                                    />

                                    <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled={li === 0}
                                        onClick={() => {
                                          const u = [...modules];
                                          [u[mi].lessons[li], u[mi].lessons[li - 1]] = [u[mi].lessons[li - 1], u[mi].lessons[li]];
                                          setModules(u);
                                        }}
                                        title="Subir lección"
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
                                        title="Bajar lección"
                                      >
                                        <ChevronDown className="h-4 w-4" />
                                      </Button>

                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => deleteLesson(mi, li)}
                                        className="text-destructive hover:text-destructive"
                                        title="Eliminar lección"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Contenido colapsable de la lección */}
                                  <CollapsibleContent>
                                    <div className="px-3 pb-3 space-y-3">
                                      <Select
                                        value={les.type}
                                        onValueChange={(v) => {
                                          const u = [...modules];
                                          if (u[mi]?.lessons?.[li]) {
                                            u[mi].lessons[li].type = v as any;
                                            if (v === "video") u[mi].lessons[li].content_text = "";
                                            if (v === "text") u[mi].lessons[li].video_url = "";
                                            setModules(u);
                                          }
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

                                      {les.type === "video" && (
                                        <LessonVideoUploader
                                          lessonId={les.id}
                                          currentUrl={les.video_url || null}
                                          onUrlChange={(url) => {
                                            const u = [...modules];
                                            if (u[mi]?.lessons?.[li]) {
                                              u[mi].lessons[li].video_url = url;
                                              setModules(u);
                                            }
                                          }}
                                        />
                                      )}

                                      {les.type === "text" && (
                                        <Textarea
                                          value={les.content_text || ""}
                                          onChange={(e) => {
                                            const u = [...modules];
                                            if (u[mi]?.lessons?.[li]) {
                                              u[mi].lessons[li].content_text = e.target.value;
                                              setModules(u);
                                            }
                                          }}
                                          placeholder="Escribe el contenido de la lección aquí..."
                                          className="min-h-[200px]"
                                        />
                                      )}

                                      {/* Descripción de la lección */}
                                      <div className="space-y-1">
                                        <Label className="text-xs text-muted-foreground">
                                          Descripción (opcional)
                                        </Label>
                                        <Textarea
                                          value={les.description || ""}
                                          onChange={(e) => {
                                            const u = [...modules];
                                            if (u[mi]?.lessons?.[li]) {
                                              u[mi].lessons[li].description = e.target.value;
                                              setModules(u);
                                            }
                                          }}
                                          placeholder="Breve descripción que verán los estudiantes..."
                                          className="min-h-[80px]"
                                        />
                                      </div>

                                      {/* Recursos: archivos o enlaces */}
                                      <LessonResourcesEditor
                                        lessonId={les.id}
                                        resources={les.resources || []}
                                        onChange={(next) => {
                                          const u = [...modules];
                                          if (u[mi]?.lessons?.[li]) {
                                            u[mi].lessons[li].resources = next;
                                            setModules(u);
                                          }
                                        }}
                                      />
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            ))}

                            <Button variant="outline" size="sm" onClick={() => addLesson(mi)} className="mt-2">
                              <Plus className="h-4 w-4 mr-1" />
                              Agregar Lección
                            </Button>

                            {id && !mod.id?.startsWith("new-") && (
                              <div className="mt-3">
                                <ModuleResourcesEditor moduleId={mod.id} courseId={id} />
                              </div>
                            )}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </div>

          <Button 
            onClick={() => handleSave()} 
            disabled={!canSaveCourse} 
            size="lg" 
            className="w-full"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Cambios
          </Button>
        </TabsContent>

        {/* Tab: Gestión de Alumnos */}
        <TabsContent value="students">
          {id && <StudentManagement productId={id} productType="course" />}
        </TabsContent>

        {/* Tab: Comunidad */}
        <TabsContent value="community">
          {id && (
            <CourseCommunityManager
              courseId={id}
              communityEnabled={form.community_enabled}
              onToggle={(v) => {
                setForm((p) => ({ ...p, community_enabled: v }));
                handleSave({ community_enabled: v });
              }}
            />
          )}
        </TabsContent>

        {/* Tab: Evaluaciones */}
        <TabsContent value="reviews">
          <CreatorReviewsPage />
        </TabsContent>

        {/* Tab: Páginas de pago */}
        <TabsContent value="checkout">
          <CheckoutPagesPage />
        </TabsContent>
      </Tabs>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur sm:hidden">
        <Button type="button" onClick={() => handleSave()} disabled={!canSaveCourse} className="w-full" size="lg">
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
