import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Play, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Job = {
  lesson_id: string;
  status: "pending" | "running" | "done" | "error";
  error_message: string | null;
  bunny_video_id: string | null;
  updated_at: string;
};

/**
 * Admin-only page to run the Lovable Cloud → Bunny Stream video migration.
 * Enqueues every legacy lesson video into `video_migration_jobs` and processes
 * them one at a time by invoking the `bunny-migrate-lesson` edge function,
 * while the page stays open. Cleanup of the original storage objects is a
 * separate manual step below.
 */
export default function AdminVideoMigrationPage() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalLegacy, setTotalLegacy] = useState(0);

  const refresh = async () => {
    const { data: js } = await (supabase as any)
      .from("video_migration_jobs")
      .select("lesson_id, status, error_message, bunny_video_id, updated_at")
      .order("updated_at", { ascending: false });
    setJobs((js as Job[]) ?? []);

    const { count } = await (supabase as any)
      .from("lessons")
      .select("id", { head: true, count: "exact" })
      .eq("video_source", "legacy")
      .not("video_url", "is", null);
    setTotalLegacy(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const enqueueAll = async () => {
    const { data: lessons, error } = await (supabase as any)
      .from("lessons")
      .select("id, video_url, video_source")
      .eq("video_source", "legacy")
      .not("video_url", "is", null);
    if (error) {
      toast.error(error.message);
      return;
    }
    const rows = (lessons ?? [])
      .filter((l: any) => l.video_url && !/^https?:\/\//i.test(l.video_url))
      .map((l: any) => ({ lesson_id: l.id, status: "pending" as const, error_message: null }));
    if (rows.length === 0) {
      toast.info("No hay videos legacy por migrar");
      return;
    }
    const { error: upErr } = await (supabase as any)
      .from("video_migration_jobs")
      .upsert(rows, { onConflict: "lesson_id" });
    if (upErr) {
      toast.error(upErr.message);
      return;
    }
    toast.success(`${rows.length} lecciones encoladas`);
    await refresh();
  };

  const runMigration = async () => {
    setRunning(true);
    try {
      while (true) {
        const { data: nextRows } = await (supabase as any)
          .from("video_migration_jobs")
          .select("lesson_id")
          .in("status", ["pending"])
          .limit(1);
        const next = nextRows?.[0];
        if (!next) break;
        await (supabase as any)
          .from("video_migration_jobs")
          .update({ status: "running" })
          .eq("lesson_id", next.lesson_id);
        try {
          await supabase.functions.invoke("bunny-migrate-lesson", {
            body: { lessonId: next.lesson_id },
          });
        } catch (e: any) {
          await (supabase as any)
            .from("video_migration_jobs")
            .update({ status: "error", error_message: e?.message ?? "invoke failed" })
            .eq("lesson_id", next.lesson_id);
        }
        await refresh();
      }
      toast.success("Migración completada");
    } finally {
      setRunning(false);
      await refresh();
    }
  };

  const retryFailed = async () => {
    await (supabase as any)
      .from("video_migration_jobs")
      .update({ status: "pending", error_message: null })
      .eq("status", "error");
    await refresh();
  };

  const cleanupLegacy = async () => {
    if (!confirm("Eliminar los archivos originales de Storage? Esto es irreversible.")) return;
    const { data, error } = await supabase.functions.invoke("bunny-cleanup-legacy");
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Eliminados: ${(data as any)?.removed ?? 0}`);
  };

  const stats = useMemo(() => {
    const done = jobs.filter((j) => j.status === "done").length;
    const err = jobs.filter((j) => j.status === "error").length;
    const running = jobs.filter((j) => j.status === "running").length;
    const pending = jobs.filter((j) => j.status === "pending").length;
    const total = jobs.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, err, running, pending, total, pct };
  }, [jobs]);

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
      </div>
    );
  }

  const failed = jobs.filter((j) => j.status === "error");

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Migración de videos a Bunny.net</h1>
        <p className="text-sm text-muted-foreground">
          Mueve los videos alojados en Lovable Cloud a Bunny Stream. Los PDFs y otros
          archivos no se tocan.
        </p>
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {stats.done} de {stats.total} videos migrados
              {stats.err > 0 ? ` · ${stats.err} con error` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Videos legacy detectados en la base: {totalLegacy}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refrescar
            </Button>
            <Button variant="outline" size="sm" onClick={enqueueAll} disabled={running}>
              Encolar todas
            </Button>
            <Button size="sm" onClick={runMigration} disabled={running || stats.pending === 0}>
              {running ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Iniciar migración
            </Button>
          </div>
        </div>
        <Progress value={stats.pct} className="h-2" />
      </div>

      {failed.length > 0 && (
        <div className="border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Errores</h3>
            <Button variant="outline" size="sm" onClick={retryFailed}>
              Reintentar todas
            </Button>
          </div>
          <ul className="text-xs space-y-1 max-h-64 overflow-y-auto">
            {failed.map((f) => (
              <li key={f.lesson_id} className="font-mono text-muted-foreground">
                {f.lesson_id}: {f.error_message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border rounded-lg p-4">
        <h3 className="font-medium mb-1">Limpieza final</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Cuando todas las lecciones estén en verde en Bunny (estado <code>ready</code>),
          elimina los archivos originales de Lovable Cloud. Este paso es irreversible.
        </p>
        <Button
          variant="destructive"
          size="sm"
          disabled={stats.total === 0 || stats.done < stats.total}
          onClick={cleanupLegacy}
        >
          <Trash2 className="h-4 w-4 mr-1" /> Eliminar originales de Storage
        </Button>
      </div>
    </div>
  );
}
