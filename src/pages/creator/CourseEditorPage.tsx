import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { generateSlug } from "@/lib/utils";
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
import StudentManagement from "@/components/creator/StudentManagement";

type LessonForm = {
  id: string;
  title: string;
  type: "video" | "text";
  video_url?: string | null;
  content_text?: string | null;
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
function RichTextEditor({ value, onChange }: { value: string; onChange: (html: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null);

  // sincroniza contenido cuando se carga el curso
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if ((el.innerHTML || "") !== (value || "")) el.innerHTML = value || "";
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML || "");
  };

  const addLink = () => {
    const url = window.prompt("Pega el link (https://...)");
    if (!url) return;
    exec("createLink", url);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => exec("bold")}>
          <Bold className="h-4 w-4 mr-1" />
          Negrita
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exec("italic")}>
          <Italic className="h-4 w-4 mr-1" />
          Cursiva
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exec("underline")}>
          <Underline className="h-4 w-4 mr-1" />
          Subrayado
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exec("insertUnorderedList")}>
          <List className="h-4 w-4 mr-1" />
          Lista
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => exec("insertOrderedList")}>
          <ListOrdered className="h-4 w-4 mr-1" />
          Numerada
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={addLink}>
          <Link2 className="h-4 w-4 mr-1" />
          Link
        </Button>
      </div>

      <div
        ref={ref}
        contentEditable
        className="min-h-[180px] rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        onInput={() => onChange(ref.current?.innerHTML || "")}
        onBlur={() => onChange(ref.current?.innerHTML || "")}
        suppressContentEditableWarning
      />

      <p className="text-xs text-muted-foreground">Tip: pega texto normal y luego aplica formato con los botones.</p>
    </div>
  );
}

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
  const { user } = useAuth();
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
  });

  const { data: existingModules, isLoading: isLoadingModules } = useQuery({
    queryKey: ["edit-modules", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_modules")
        .select("*, lessons(*)")
        .eq("course_id", id)
        .order("order_index");
      if (error) throw error;

      return (
        data?.map((m: any) => ({
          ...m,
          lessons: ((m.lessons as any[]) || []).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
        })) || []
      );
    },
    enabled: !!id,
  });

  // cargar curso
  useEffect(() => {
    if (!course) return;

    const initialForm = {
      title: course.title ?? "",
      description_html: course.description ?? "",
      price_clp: course.price_clp ?? 0,
      level: course.level ?? "beginner",
      category_id: course.category_id ?? "",
      status: course.status ?? "draft",
      format: (course as any).format ?? "recorded",
    };
    
    setForm(initialForm);
    initialFormRef.current = initialForm;
  }, [course]);

  useEffect(() => {
    if (existingModules) {
      setModules(existingModules as any);
      initialModulesRef.current = JSON.parse(JSON.stringify(existingModules));
      setDeletedModuleIds([]);
      setDeletedLessonIds([]);
      setHasChanges(false);
    }
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
    mutationFn: async () => {
      if (!user?.id) throw new Error("Debes iniciar sesión");
      if (!id) throw new Error("No se pudo determinar courseId");

      const nowIso = new Date().toISOString();

      const payload: any = {
        title: (form.title || "").trim(),
        description: form.description_html || "",
        price_clp: Number(form.price_clp || 0),
        level: form.level,
        category_id: form.category_id || null,
        status: form.status,
        format: form.format,
        updated_at: nowIso,
      };

      // Status is already handled in the payload
      if (!course?.slug) payload.slug = `${generateSlug(form.title || "curso")}-${Date.now().toString(36)}`;

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
          const lessonPayload = {
            title: les.title,
            type: les.type,
            video_url: les.type === "video" ? (les.video_url || null) : null,
            content_text: les.type === "text" ? (les.content_text || null) : null,
            order_index: li,
            module_id: moduleId,
          };

          if (les.id?.startsWith("new-")) {
            const { error } = await supabase.from("lessons").insert(lessonPayload);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("lessons")
              .update(lessonPayload)
              .eq("id", les.id);
            if (error) throw error;
          }
        }
      }

      return { id };
    },
    onSuccess: ({ id: courseId }) => {
      queryClient.invalidateQueries({ queryKey: ["creator-courses"] });
      queryClient.invalidateQueries({ queryKey: ["edit-course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["edit-modules", courseId] });
      
      // Reset change tracking
      setHasChanges(false);
      initialFormRef.current = { ...form };
      initialModulesRef.current = JSON.parse(JSON.stringify(modules));
      setDeletedModuleIds([]);
      setDeletedLessonIds([]);

      toast({ title: "Curso guardado correctamente ✅" });
    },
    onError: (e: any) => {
      console.error("Save error:", e);
      toast({
        title: "Error al guardar",
        description: e?.message ?? "Revisa tu conexión o intenta nuevamente",
        variant: "destructive",
      });
    },
  });

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
      { id: `new-${Date.now()}`, title: "Nueva lección", type: "video", video_url: "", content_text: "" },
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

  if (loading && !id) {
    return (
      <div className="p-8 flex justify-center items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm text-muted-foreground">Creando curso…</span>
      </div>
    );
  }

  if (loading && id) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
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
                setTimeout(() => saveMutation.mutate(), 0);
              }}
            >
              Sí, publicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Editar Curso</h1>
        <div className="flex gap-2">
          {course?.id && (
            <>
              <Button variant="outline" asChild>
                <a href={`${window.location.origin}/#/course/${course.slug}`} target="_blank" rel="noreferrer">
                  <Link2 className="h-4 w-4 mr-2" />
                  Ver página pública
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={`${window.location.origin}/#/app/course/${course.id}?preview=true`} target="_blank" rel="noreferrer">
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
                onClick={() => saveMutation.mutate()} 
                disabled={saveMutation.isPending || !hasChanges}
                className={!hasChanges ? "opacity-50" : ""}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Guardar Borrador
              </Button>
              <Button onClick={() => setShowPublishDialog(true)} disabled={saveMutation.isPending}>
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
              onClick={() => saveMutation.mutate()} 
              disabled={saveMutation.isPending || !hasChanges}
              className={!hasChanges ? "opacity-50" : ""}
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
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="info" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Información del Curso
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Módulos y Lecciones
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Gestión de Alumnos
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

          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending || !hasChanges} 
            size="lg" 
            className={`w-full ${!hasChanges ? "opacity-50" : ""}`}
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
                              <div key={les.id} className="flex gap-2 items-start bg-background/80 p-3 rounded-lg shadow-sm">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Lección {li + 1}</span>
                                  </div>
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
                                    className="font-medium"
                                  />

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
                            ))}

                            <Button variant="outline" size="sm" onClick={() => addLesson(mi)} className="mt-2">
                              <Plus className="h-4 w-4 mr-1" />
                              Agregar Lección
                            </Button>
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
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending || !hasChanges} 
            size="lg" 
            className={`w-full ${!hasChanges ? "opacity-50" : ""}`}
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
      </Tabs>
    </div>
  );
}
