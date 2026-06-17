import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useGoogleConnection } from "@/hooks/useGoogleConnection";
import { Link } from "react-router-dom";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

interface Rule { id?: string; day_of_week: number; start_time: string; end_time: string; _new?: boolean; }

export default function CreatorAvailabilityPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { connection } = useGoogleConnection();

  const [tz, setTz] = useState("America/Santiago");
  const [duration, setDuration] = useState(30);
  const [bufferBefore, setBufferBefore] = useState(0);
  const [bufferAfter, setBufferAfter] = useState(0);
  const [minNotice, setMinNotice] = useState(12);
  const [maxDays, setMaxDays] = useState(30);
  const [rules, setRules] = useState<Rule[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["availability", user?.id],
    queryFn: async () => {
      const [s, r] = await Promise.all([
        supabase.from("creator_availability_settings").select("*").eq("creator_id", user!.id).maybeSingle(),
        supabase.from("creator_availability_rules").select("*").eq("creator_id", user!.id).order("day_of_week"),
      ]);
      return { settings: s.data, rules: r.data || [] };
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (data?.settings) {
      setTz(data.settings.timezone);
      setDuration(data.settings.session_duration_min);
      setBufferBefore(data.settings.buffer_before_min);
      setBufferAfter(data.settings.buffer_after_min);
      setMinNotice(data.settings.min_notice_hours);
      setMaxDays(data.settings.max_days_ahead);
    }
    if (data?.rules) {
      setRules(data.rules.map((r: any) => ({
        id: r.id, day_of_week: r.day_of_week,
        start_time: r.start_time.slice(0,5), end_time: r.end_time.slice(0,5),
      })));
    }
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error: sErr } = await supabase.from("creator_availability_settings").upsert({
        creator_id: user!.id, timezone: tz,
        session_duration_min: duration,
        buffer_before_min: bufferBefore, buffer_after_min: bufferAfter,
        min_notice_hours: minNotice, max_days_ahead: maxDays,
      }, { onConflict: "creator_id" });
      if (sErr) throw sErr;

      // Replace rules: delete all + insert
      const { error: dErr } = await supabase.from("creator_availability_rules").delete().eq("creator_id", user!.id);
      if (dErr) throw dErr;
      if (rules.length) {
        const { error: iErr } = await supabase.from("creator_availability_rules").insert(
          rules.map((r) => ({
            creator_id: user!.id, day_of_week: r.day_of_week,
            start_time: r.start_time, end_time: r.end_time,
          })),
        );
        if (iErr) throw iErr;
      }
    },
    onSuccess: () => {
      toast.success("Disponibilidad guardada");
      qc.invalidateQueries({ queryKey: ["availability"] });
    },
    onError: (e: any) => toast.error("No se pudo guardar", { description: e.message }),
  });

  const addBlock = (dow: number) =>
    setRules((r) => [...r, { day_of_week: dow, start_time: "09:00", end_time: "17:00", _new: true }]);

  const removeBlock = (idx: number) => setRules((r) => r.filter((_, i) => i !== idx));

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Disponibilidad</h1>
        <p className="text-muted-foreground mt-1">Configura tus horarios para sesiones 1:1.</p>
      </div>

      {!connection && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4 text-sm">
            Para que los slots se bloqueen automáticamente con tu agenda, <Link to="/creator-app/integrations" className="font-medium underline">conecta Google Calendar</Link>.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Configuración general</CardTitle>
          <CardDescription>Aplica a todas tus sesiones 1:1.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Zona horaria</Label>
            <Input value={tz} onChange={(e) => setTz(e.target.value)} />
          </div>
          <div>
            <Label>Duración por defecto</Label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[15, 30, 45, 60, 90, 120].map((m) => (
                  <SelectItem key={m} value={String(m)}>{m} min</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label>Anticipación mínima (horas)</Label>
            <Input type="number" min={0} value={minNotice} onChange={(e) => setMinNotice(+e.target.value)} />
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
          <CardDescription>Bloques disponibles para reservar cada día.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? <Loader2 className="animate-spin" /> : DAYS.map((label, dow) => {
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

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Guardar disponibilidad
        </Button>
      </div>
    </div>
  );
}
