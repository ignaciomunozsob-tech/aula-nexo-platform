import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2, Save, Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useGoogleConnection } from "@/hooks/useGoogleConnection";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { Link } from "react-router-dom";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
interface Rule { id?: string; day_of_week: number; start_time: string; end_time: string; }

export default function SessionEditorPage() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { connection } = useGoogleConnection();

  // Service fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMin, setDurationMin] = useState(30);
  const [coverUrl, setCoverUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  // Availability fields
  const [tz, setTz] = useState("America/Santiago");
  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(0);
  const [minNotice, setMinNotice] = useState(12);
  const [maxDays, setMaxDays] = useState(30);
  const [rules, setRules] = useState<Rule[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["session-full", id],
    queryFn: async () => {
      const [s, r] = await Promise.all([
        supabase.from("one_on_one_sessions").select("*").eq("id", id!).single(),
        supabase.from("session_availability_rules").select("*").eq("session_id", id!).order("day_of_week"),
      ]);
      if (s.error) throw s.error;
      return { session: s.data, rules: r.data || [] };
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (data?.session) {
      const s: any = data.session;
      setTitle(s.title);
      setDescription(s.description || "");
      setDurationMin(s.duration_min);
      setCoverUrl(s.cover_url || "");
      setStatus(s.status);
      setTz(s.timezone || "America/Santiago");
      setBufferBefore(s.buffer_before_min ?? 0);
      setBufferAfter(s.buffer_after_min ?? 0);
      setMinNotice(s.min_notice_hours ?? 12);
      setMaxDays(s.max_days_ahead ?? 30);
    }
    if (data?.rules) {
      setRules(data.rules.map((r: any) => ({
        id: r.id, day_of_week: r.day_of_week,
        start_time: r.start_time.slice(0, 5), end_time: r.end_time.slice(0, 5),
      })));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Título requerido");
      // Generate slug for new sessions, keep existing slug on edit
      const { generateSlug } = await import("@/lib/utils");
      const baseSlug = generateSlug(title.trim()) || `sesion-${Date.now().toString(36)}`;
      const payload: any = {
        creator_id: user!.id,
        title: title.trim(),
        description: description.trim() || null,
        duration_min: durationMin,
        cover_url: coverUrl.trim() || null,
        status,
        price_clp: 0,
        timezone: tz,
        buffer_before_min: bufferBefore,
        buffer_after_min: bufferAfter,
        min_notice_hours: minNotice,
        max_days_ahead: maxDays,
      };
      let sessionId = id;
      if (isEditing) {
        const { error } = await supabase.from("one_on_one_sessions").update(payload).eq("id", id!);
        if (error) throw error;
      } else {
        payload.slug = `${baseSlug}-${Date.now().toString(36).slice(-4)}`;
        const { data, error } = await supabase
          .from("one_on_one_sessions")
          .insert(payload).select("id").single();
        if (error) throw error;
        sessionId = data.id;
      }
      // Replace rules
      await supabase.from("session_availability_rules").delete().eq("session_id", sessionId!);
      if (rules.length) {
        const { error } = await supabase.from("session_availability_rules").insert(
          rules.map((r) => ({
            session_id: sessionId!, day_of_week: r.day_of_week,
            start_time: r.start_time, end_time: r.end_time,
          })),
        );
        if (error) throw error;
      }
      if (!isEditing && sessionId) navigate(`/creator-app/sessions/${sessionId}/edit`, { replace: true });
    },
    onSuccess: () => {
      toast.success("Servicio guardado");
      qc.invalidateQueries({ queryKey: ["session-full"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copyFromDefaults = async () => {
    const [s, r] = await Promise.all([
      supabase.from("creator_availability_settings").select("*").eq("creator_id", user!.id).maybeSingle(),
      supabase.from("creator_availability_rules").select("*").eq("creator_id", user!.id).order("day_of_week"),
    ]);
    if (s.data) {
      setTz(s.data.timezone);
      setBufferBefore(s.data.buffer_before_min);
      setBufferAfter(s.data.buffer_after_min);
      setMinNotice(s.data.min_notice_hours);
      setMaxDays(s.data.max_days_ahead);
    }
    if (r.data?.length) {
      setRules(r.data.map((rr: any) => ({
        day_of_week: rr.day_of_week,
        start_time: rr.start_time.slice(0, 5), end_time: rr.end_time.slice(0, 5),
      })));
      toast.success("Disponibilidad copiada desde tus defaults");
    } else {
      toast.message("No tienes defaults configurados");
    }
  };

  const addBlock = (dow: number) =>
    setRules((r) => [...r, { day_of_week: dow, start_time: "09:00", end_time: "17:00" }]);
  const removeBlock = (idx: number) => setRules((r) => r.filter((_, i) => i !== idx));

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 sm:p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/creator-app/products")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver
      </Button>
      <h1 className="text-3xl font-bold">{isEditing ? "Editar" : "Nuevo"} servicio</h1>

      {!connection && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4 text-sm">
            Conecta <Link to="/creator-app/integrations" className="font-medium underline">Google Calendar</Link> para
            bloquear automáticamente horarios ocupados y generar links de Meet.
          </CardContent>
        </Card>
      )}

      {isLoading && isEditing ? <Loader2 className="animate-spin" /> : (
        <Tabs defaultValue="info">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-max sm:w-auto">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="availability">Disponibilidad</TabsTrigger>
          </TabsList>
          </div>

          <TabsContent value="info" className="space-y-4 mt-4">
            <Card>
              <CardHeader><CardTitle>Detalles del servicio</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Título *</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Mentoría de marca personal" />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
                    placeholder="¿Qué incluye? ¿A quién está dirigido?" />
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>Configuración de disponibilidad</CardTitle>
                  <CardDescription>Solo aplica a este servicio.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={copyFromDefaults}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copiar defaults
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Zona horaria</Label>
                  <Input value={tz} onChange={(e) => setTz(e.target.value)} />
                </div>
                <div>
                  <Label>Anticipación mínima (horas)</Label>
                  <Input type="number" min={0} value={minNotice} onChange={(e) => setMinNotice(+e.target.value)} />
                </div>
                <div>
                  <Label>Buffer antes (min)</Label>
                  <Input type="number" min={0} value={bufferBefore} onChange={(e) => setBufferBefore(+e.target.value)} />
                </div>
                <div>
                  <Label>Buffer después (min)</Label>
                  <Input type="number" min={0} value={bufferAfter} onChange={(e) => setBufferAfter(+e.target.value)} />
                </div>
                <div>
                  <Label>Ventana de reserva (días)</Label>
                  <Input type="number" min={1} max={365} value={maxDays} onChange={(e) => setMaxDays(+e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Horario semanal</CardTitle>
                <CardDescription>Bloques disponibles para este servicio.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {DAYS.map((label, dow) => {
                  const dayRules = rules.map((r, i) => ({ r, i })).filter((x) => x.r.day_of_week === dow);
                  return (
                    <div key={dow} className="border-b pb-3 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">{label}</p>
                        <Button size="sm" variant="outline" onClick={() => addBlock(dow)}>
                          <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
                        </Button>
                      </div>
                      {dayRules.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin disponibilidad</p>
                      ) : (
                        <div className="space-y-2">
                          {dayRules.map(({ r, i }) => (
                            <div key={i} className="flex items-center gap-2">
                              <Input type="time" value={r.start_time} onChange={(e) => {
                                const v = e.target.value;
                                setRules((prev) => prev.map((x, j) => j === i ? { ...x, start_time: v } : x));
                              }} className="w-32" />
                              <span>–</span>
                              <Input type="time" value={r.end_time} onChange={(e) => {
                                const v = e.target.value;
                                setRules((prev) => prev.map((x, j) => j === i ? { ...x, end_time: v } : x));
                              }} className="w-32" />
                              <Button size="icon" variant="ghost" onClick={() => removeBlock(i)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full sm:w-auto">
          {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar servicio
        </Button>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur sm:hidden">
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full" size="lg">
          {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar servicio
        </Button>
      </div>
    </div>
  );
}
