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
import { Loader2, Plus, Trash2, ChevronUp, ChevronDown, Save } from "lucide-react";
import CourseCoverUploader from "@/components/layout/CourseCoverUploader";

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

export default function CourseEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Evita doble creación en React Strict Mode (dev)
  const autoCreateRanRef = useRef(false);
  const [autoCreating, setAutoCreating] = useState(false);

  const [form, setForm] = useState({
    title: "",
    short_description: "",
    description: "",
    price_clp: 0,
    level: "beginner",
    category_id: "",
    status: "draft",
    // arrays tipo coursera
    learn_bullets: ["", "", "", ""], // 4 bullets por defecto
    requirements: [""],
    includes: ["Acceso de por vida", "Aprende a tu ritmo"],
  });

  const [modules, setModules] = useState<ModuleForm[]>([]);
  const [deletedModuleIds, setDeletedModuleIds] = useState<string[]>([]);
  const [deletedLessonIds, setDeletedLessonIds] = useState<string[]>([]);

  // ✅ Auto-crear curso apenas entras a "Nuevo Curso" para tener ID al tiro (portada inmediata)
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
            short_description: "",
            description: "",
            price_clp: 0,
            level: "beginner",
            status: "draft",
            category_id: null,
            learn_bullets: ["", "", "", ""],
            requirements: [""],
            includes: ["Acceso de por vida", "Aprende a tu ritmo"],
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

  useEffect(() => {
    if (!course) return;

    setForm((prev) => ({
      ...prev,
      title: course.title ?? "",
      short_description: course.short_description ?? "",
      description: course.description ?? "",
      price_clp: course.price_clp ?? 0,
      level: course.level ?? "beginner",
      category_id: course.category_id ?? "",
      status: course.status ?? "draft",
      learn_bullets: Array.isArray(course.learn_bullets) ? course.learn_bullets : ["", "", "", ""],
      requirements: Array.isArray(course.requirements) ? course.requirements : [""],
      includes: Array.isArray(course.includes) ? course.includes : ["Acceso de por vida", "Aprende a tu ritmo"],
    }));
  }, [course]);

  useEffect(() => {
    if (existingModules) {
      setModules(existingModules as any);
      setDeletedModuleIds([]);
      setDeletedLessonIds([]);
    }
  }, [existingModules]);

   // Helpers listas
  type ListKey = "learn_bullets" | "requirements" | "includes";

  const updateListItem = (key: ListKey, idx: number, value: string) => {
    setForm((prev) => {
      const arr = [...(prev[key] as string[])];
      arr[idx] = value;
      return { ...prev, [key]: arr };
    });
  };

  const addListItem = (key: ListKey) => {
    setForm((prev) => ({ ...prev, [key]: [...(prev[key] as string[]), ""] }));
  };

  const removeListItem = (key: ListKey, idx: number) => {
    setForm((prev) => {
      const arr = [...(prev[key] as string[])];
      arr.splice(idx, 1);
      return { ...prev, [key]: arr.length ? arr : [""] };
    });
  };
