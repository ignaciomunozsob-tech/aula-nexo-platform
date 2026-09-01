import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Trash2, Copy, Layers } from "lucide-react";

interface Props {
  courseId: string;
  courseSlug?: string | null;
  creatorSlug?: string | null;
  coursePrice?: number | null;
}

type GroupRow = {
  id: string;
  name: string;
  price_clp: number | null;
  is_default: boolean;
};

function formatCLP(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function CourseGroupsManager({ courseId, courseSlug, creatorSlug, coursePrice }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { name: string; price: string }>>({});

  const { data: groups, isLoading } = useQuery({
    queryKey: ["course-groups", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_groups")
        .select("id, name, price_clp, is_default")
        .eq("course_id", courseId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as GroupRow[];
    },
    enabled: !!courseId,
  });

  const { data: modules } = useQuery({
    queryKey: ["course-groups-modules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_modules")
        .select("id, title, order_index")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!courseId,
  });

  const groupIds = useMemo(() => (groups || []).map((g) => g.id), [groups]);

  const { data: groupModules } = useQuery({
    queryKey: ["course-group-modules", courseId, groupIds.join(",")],
    queryFn: async () => {
      if (groupIds.length === 0) return [] as { group_id: string; module_id: string }[];
      const { data, error } = await supabase
        .from("course_group_modules")
        .select("group_id, module_id")
        .in("group_id", groupIds);
      if (error) throw error;
      return data || [];
    },
    enabled: groupIds.length > 0,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["course-groups", courseId] });
    queryClient.invalidateQueries({ queryKey: ["course-group-modules", courseId] });
  };

  const createGroup = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from("course_groups")
        .insert({ course_id: courseId, name, is_default: false })
        .select("id")
        .single();
      if (error) throw error;
      // Nuevo grupo parte con todos los módulos habilitados
      const moduleIds = (modules || []).map((m: any) => m.id);
      if (moduleIds.length > 0) {
        await supabase
          .from("course_group_modules")
          .insert(moduleIds.map((mid: string) => ({ group_id: data.id, module_id: mid })));
      }
    },
    onSuccess: () => {
      setNewName("");
      invalidate();
      toast({ title: "Grupo creado" });
    },
    onError: (e: any) => toast({ title: "No se pudo crear el grupo", description: e.message, variant: "destructive" }),
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, name, price_clp }: { id: string; name: string; price_clp: number | null }) => {
      const { error } = await supabase.from("course_groups").update({ name, price_clp }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Grupo actualizado" });
    },
    onError: (e: any) => toast({ title: "No se pudo actualizar", description: e.message, variant: "destructive" }),
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("course_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Grupo eliminado" });
    },
    onError: (e: any) => toast({ title: "No se pudo eliminar", description: e.message, variant: "destructive" }),
  });

  const toggleModule = useMutation({
    mutationFn: async ({ groupId, moduleId, enabled }: { groupId: string; moduleId: string; enabled: boolean }) => {
      if (enabled) {
        const { error } = await supabase
          .from("course_group_modules")
          .insert({ group_id: groupId, module_id: moduleId });
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase
          .from("course_group_modules")
          .delete()
          .eq("group_id", groupId)
          .eq("module_id", moduleId);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["course-group-modules", courseId] }),
    onError: (e: any) => toast({ title: "No se pudo actualizar el acceso", description: e.message, variant: "destructive" }),
  });

  const hasModule = (groupId: string, moduleId: string) =>
    (groupModules || []).some((gm: any) => gm.group_id === groupId && gm.module_id === moduleId);

  const groupUrl = (groupId: string) => {
    const base = window.location.origin;
    const path = creatorSlug && courseSlug ? `/${creatorSlug}/${courseSlug}` : `/course/${courseSlug || courseId}`;
    return `${base}${path}?group=${groupId}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-6">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando grupos…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border rounded-lg p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Grupos del curso</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Crea grupos con distinto precio y distinto acceso a módulos. Comparte el enlace de cada grupo para que
          quienes compren queden asignados automáticamente.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="Nombre del nuevo grupo (ej: Cohorte Marzo)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button
            onClick={() => createGroup.mutate(newName.trim())}
            disabled={!newName.trim() || createGroup.isPending}
          >
            {createGroup.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
            Crear grupo
          </Button>
        </div>
      </div>

      {(groups || []).map((g) => {
        const draft = drafts[g.id] ?? { name: g.name, price: g.price_clp == null ? "" : String(g.price_clp) };
        return (
          <div key={g.id} className="bg-card border rounded-lg p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{g.name}</h3>
                {g.is_default && <Badge variant="secondary">Predeterminado</Badge>}
              </div>
              {!g.is_default && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteGroup.mutate(g.id)}
                  disabled={deleteGroup.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Nombre</Label>
                <Input
                  className="mt-1"
                  value={draft.name}
                  onChange={(e) => setDrafts((d) => ({ ...d, [g.id]: { ...draft, name: e.target.value } }))}
                />
              </div>
              <div>
                <Label>Precio (CLP)</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min={0}
                  placeholder={`Usar precio del curso (${formatCLP(coursePrice || 0)})`}
                  value={draft.price}
                  onChange={(e) => setDrafts((d) => ({ ...d, [g.id]: { ...draft, price: e.target.value } }))}
                />
                <p className="text-xs text-muted-foreground mt-1">Déjalo vacío para usar el precio general del curso.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() =>
                  updateGroup.mutate({
                    id: g.id,
                    name: draft.name.trim() || g.name,
                    price_clp: draft.price.trim() === "" ? null : Math.max(0, Math.round(Number(draft.price))),
                  })
                }
                disabled={updateGroup.isPending}
              >
                {updateGroup.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Guardar grupo
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(groupUrl(g.id));
                  toast({ title: "Enlace copiado" });
                }}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copiar enlace del grupo
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Módulos incluidos</Label>
              {(modules || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay módulos en este curso.</p>
              ) : (
                <div className="space-y-2">
                  {(modules || []).map((m: any) => (
                    <label key={m.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={hasModule(g.id, m.id)}
                        onCheckedChange={(checked) =>
                          toggleModule.mutate({ groupId: g.id, moduleId: m.id, enabled: !!checked })
                        }
                      />
                      {m.title}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
