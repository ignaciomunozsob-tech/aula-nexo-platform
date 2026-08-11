import { useEffect, useRef, useState } from "react";
import * as tus from "tus-js-client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, RefreshCw, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  eventId: string;
}

type Status = "idle" | "uploading" | "processing" | "ready" | "error";

/**
 * Single-file recording uploader for online events. Mirrors the course lesson
 * uploader (resumable upload + inline signed preview) but allows only one video.
 */
export default function EventRecordingUploader({ eventId }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [videoId, setVideoId] = useState<string | null>(null);

  // Load current recording state
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("events")
        .select("recording_video_id, recording_status")
        .eq("id", eventId)
        .maybeSingle();
      if (!alive || !data) return;
      if (data.recording_video_id) {
        setVideoId(data.recording_video_id);
        setStatus((data.recording_status as Status) || "ready");
      }
    })();
    return () => {
      alive = false;
    };
  }, [eventId]);

  // Poll while processing
  useEffect(() => {
    if (status !== "processing" && status !== "uploading") return;
    if (!videoId) return;
    let alive = true;
    const t = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("event-recording-video", {
          body: { action: "status", eventId },
        });
        if (!alive) return;
        const s = (data as any)?.status as Status | undefined;
        if (s === "ready") {
          setStatus("ready");
          toast({ title: "Grabación lista ✅" });
        } else if (s === "error") {
          setStatus("error");
          toast({ title: "Error al procesar la grabación", variant: "destructive" });
        } else if (s) {
          setStatus(s);
        }
      } catch {}
    }, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [status, videoId, eventId, toast]);

  // La firma del embed la gestiona BunnyPlayer.


  const startUpload = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast({ title: "Archivo no válido", description: "Solo se permiten videos.", variant: "destructive" });
      return;
    }
    setUploading(true);
    setProgress(0);
    setStatus("uploading");
    try {
      const { data, error } = await supabase.functions.invoke("event-recording-video", {
        body: { action: "create", eventId, title: file.name },
      });
      if (error) throw error;
      if (!data || (data as any).error) {
        throw new Error((data as any)?.detail || (data as any)?.error || "No se pudo iniciar la subida");
      }
      const cfg = data as any;
      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: cfg.endpoint,
          retryDelays: [0, 1000, 3000, 5000, 10000],
          headers: cfg.headers,
          metadata: { filetype: file.type, title: file.name },
          chunkSize: 50 * 1024 * 1024,
          onError: reject,
          onProgress: (done, total) => setProgress(Math.round((done / total) * 100)),
          onSuccess: () => resolve(),
        });
        upload.start();
      });
      setProgress(100);
      setVideoId(String(cfg.videoId));
      setStatus("processing");
      toast({ title: "Grabación subida — procesando…" });
    } catch (e: any) {
      setStatus("error");
      toast({ title: "Error al subir", description: e?.message || "Intenta nuevamente", variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const remove = async () => {
    if (!window.confirm("¿Eliminar la grabación de este evento?")) return;
    await supabase.functions.invoke("event-recording-video", {
      body: { action: "remove", eventId },
    });
    setVideoId(null);
    setStatus("idle");
    setProgress(0);
  };

  const hasVideo = !!videoId && status === "ready" && !uploading;
  const isProcessing = !uploading && (status === "processing" || (status === "uploading" && !!videoId));

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) startUpload(f);
        }}
      />

      {uploading && (
        <div className="space-y-2">
          <div className="bg-muted rounded-lg animate-pulse" style={{ aspectRatio: "16 / 9" }} />
          <Progress value={progress} />
          <p className="text-xs text-muted-foreground">Subiendo… {progress}%</p>
        </div>
      )}

      {!uploading && isProcessing && (
        <div
          className="bg-black rounded-lg flex flex-col items-center justify-center gap-2 text-white/80 text-sm"
          style={{ aspectRatio: "16 / 9" }}
        >
          <Loader2 className="h-6 w-6 animate-spin" />
          Procesando la grabación…
        </div>
      )}

      {hasVideo && (
        <div className="space-y-2">
          <div className="bg-black overflow-hidden rounded-lg" style={{ aspectRatio: "16 / 9" }}>
            {signed?.url ? (
              <iframe
                src={`${signed.url}&autoplay=false&preload=true&responsive=true`}
                 referrerPolicy="strict-origin-when-cross-origin"
                className="w-full h-full"
                style={{ border: "none" }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/70 text-sm animate-pulse">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Cargando previsualización…
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reemplazar grabación
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={remove}>
              <X className="h-4 w-4 mr-1" />
              Quitar
            </Button>
          </div>
        </div>
      )}

      {!uploading && !isProcessing && !hasVideo && (
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Subir grabación
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Un solo archivo de video. Los inscritos podrán verlo desde su cuenta cuando esté listo.
      </p>
    </div>
  );
}
