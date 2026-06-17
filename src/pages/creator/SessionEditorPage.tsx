import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export default function SessionEditorPage() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [coverUrl, setCoverUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const { data, isLoading } = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("one_on_one_sessions")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (data) {
      setTitle(data.title);
      setDescription(data.description || "");
      setDurationMin(data.duration_min);
      setCoverUrl(data.cover_url || "");
      setStatus(data.status as any);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Título requerido");
      const payload = {
        creator_id: user!.id,
        title: title.trim(),
        description: description.trim() || null,
        duration_min: durationMin,
        cover_url: coverUrl.trim() || null,
        status,
        price_clp: 0,
      };
      if (isEditing) {
        const { error } = await supabase.from("one_on_one_sessions").update(payload).eq("id", id!);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("one_on_one_sessions")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        navigate(`/creator-app/sessions/${data.id}/edit`, { replace: true });
      }
    },
    onSuccess: () => toast.success("Sesión guardada"),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/creator-app/products")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>
      <h1 className="text-3xl font-bold">{isEditing ? "Editar" : "Nueva"} sesión 1:1</h1>

      <Card>
        <CardHeader><CardTitle>Información</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {isLoading && isEditing ? <Loader2 className="animate-spin" /> : (
            <>
              <div>
                <Label>Título *</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Mentoría de marca personal" />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
                  placeholder="¿Qué incluye? ¿A quién está dirigida?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Duración</Label>
                  <Select value={String(durationMin)} onValueChange={(v) => setDurationMin(+v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[15, 30, 45, 60, 90, 120].map((m) => (
                        <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="published">Publicado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>URL de portada (opcional)</Label>
                <Input value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://..." />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar
        </Button>
      </div>
    </div>
  );
}
