import { useState, useRef, useEffect } from "react";
import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, X, Film, Link2, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMyPlan } from "@/hooks/useMyPlan";
import { Link } from "react-router-dom";

interface LessonVideoUploaderProps {
  lessonId: string;
  currentUrl: string | null;
  onUrlChange: (url: string) => void;
}

// Videos live in Bunny Stream. We keep YouTube/Vimeo URLs in the same `video_url`
// column for the "URL" mode. The bunny video id is stored separately in
// `lessons.bunny_video_id` by the edge functions.
export default function LessonVideoUploader({
  lessonId,
  currentUrl,
  onUrlChange,
}: LessonVideoUploaderProps) {
  const { toast } = useToast();
  const { data: plan } = useMyPlan();
  const allowDirectVideo = plan?.allowDirectVideo ?? false;
  const maxFileMB = plan?.maxFileMB ?? 10;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bunnyStatus, setBunnyStatus] = useState<
    "idle" | "uploading" | "processing" | "ready" | "error"
  >("idle");
  const [mode, setMode] = useState<"url" | "upload">(
    currentUrl && /^https?:\/\//i.test(currentUrl) ? "url" : "upload"
  );

  const isExternalUrl = !!currentUrl && /^https?:\/\//i.test(currentUrl);

  // Load current lesson bunny state
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("lessons")
        .select("bunny_status, bunny_video_id, video_source")
        .eq("id", lessonId)
        .maybeSingle();
      if (!alive || !data) return;
      if (data.video_source === "bunny" && data.bunny_video_id) {
        setBunnyStatus(data.bunny_status || "ready");
      }
    })();
    return () => {
      alive = false;
    };
  }, [lessonId]);

  // Poll status while processing
  useEffect(() => {
    if (bunnyStatus !== "processing" && bunnyStatus !== "uploading") return;
    let alive = true;
    const t = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("bunny-video-status", {
          body: { lessonId },
        });
        if (!alive) return;
        const s = (data as any)?.status;
        if (s === "ready") {
          setBunnyStatus("ready");
          toast({ title: "Video listo ✅" });
        } else if (s === "error") {
          setBunnyStatus("error");
          toast({ title: "Bunny reportó un error al procesar", variant: "destructive" });
        } else if (s) {
          setBunnyStatus(s);
        }
      } catch {}
    }, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [bunnyStatus, lessonId, toast]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({
        title: "Archivo no válido",
        description: "Solo se permiten archivos de video (MP4, MOV, etc.)",
        variant: "destructive",
      });
      return;
    }

    const maxSize = maxFileMB * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Archivo muy grande",
        description: `El tamaño máximo de tu plan es ${maxFileMB}MB`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);
    setBunnyStatus("uploading");

    try {
      // Ask backend to create the Bunny video and give us a TUS signature.
      const { data, error } = await supabase.functions.invoke("bunny-create-video", {
        body: { lessonId, title: file.name },
      });
      if (error || !data) throw error || new Error("No se pudo iniciar la subida");
      const {
        videoId,
        libraryId,
        tusEndpoint,
        authorizationSignature,
        authorizationExpire,
      } = data as {
        videoId: string;
        libraryId: string;
        tusEndpoint: string;
        authorizationSignature: string;
        authorizationExpire: number;
      };

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(file, {
          endpoint: tusEndpoint,
          retryDelays: [0, 1000, 3000, 5000, 10000],
          headers: {
            AuthorizationSignature: authorizationSignature,
            AuthorizationExpire: String(authorizationExpire),
            VideoId: videoId,
            LibraryId: libraryId,
          },
          metadata: {
            filetype: file.type,
            title: file.name,
          },
          chunkSize: 50 * 1024 * 1024,
          onError: (err) => reject(err),
          onProgress: (bytesUploaded, bytesTotal) => {
            setProgress(Math.round((bytesUploaded / bytesTotal) * 100));
          },
          onSuccess: () => resolve(),
        });
        upload.start();
      });

      setProgress(100);
      setBunnyStatus("processing");
      // Store the video id in the same field so parent forms have a value to save.
      // The player uses `video_source='bunny'` + `bunny_video_id`; the URL is set
      // once Bunny finishes encoding.
      onUrlChange(`bunny:${videoId}`);
      toast({ title: "Video subido — procesando en Bunny…" });
    } catch (err: any) {
      console.error("Upload error:", err);
      setBunnyStatus("error");
      toast({
        title: "Error al subir",
        description: err?.message || "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveVideo = async () => {
    onUrlChange("");
    setProgress(0);
    setBunnyStatus("idle");
    await (supabase as any)
      .from("lessons")
      .update({
        bunny_video_id: null,
        bunny_status: "ready",
        video_source: "legacy",
        video_url: null,
      })
      .eq("id", lessonId);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "url" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("url")}
        >
          <Link2 className="h-4 w-4 mr-1" />
          URL (YouTube)
        </Button>
        <Button
          type="button"
          variant={mode === "upload" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            if (!allowDirectVideo) {
              toast({
                title: "Función bloqueada en tu plan",
                description: "La subida directa de videos está disponible desde el Plan Creador.",
                variant: "destructive",
              });
              return;
            }
            setMode("upload");
          }}
          title={!allowDirectVideo ? "Disponible desde Plan Creador" : undefined}
        >
          {allowDirectVideo ? <Upload className="h-4 w-4 mr-1" /> : <Lock className="h-4 w-4 mr-1" />}
          Subir video
        </Button>
      </div>
      {!allowDirectVideo && mode === "upload" && (
        <div className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-md p-2">
          La subida directa de videos requiere <Link to="/precios" className="underline font-semibold">Plan Creador</Link>. Usa una URL de YouTube o Vimeo en el plan Gratis.
        </div>
      )}

      {mode === "url" ? (
        <Input
          value={isExternalUrl ? currentUrl || "" : ""}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      ) : (
        <div className="space-y-2">
          {bunnyStatus === "ready" && !uploading ? (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Film className="h-5 w-5 text-primary" />
              <span className="text-sm flex-1 truncate">Video listo</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveVideo}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : bunnyStatus === "processing" ? (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm flex-1">Tu video se está procesando en Bunny…</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveVideo}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-4 text-center space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
              {uploading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Subiendo a Bunny… {progress}%
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar video
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    MP4, MOV, WEBM (máx. {maxFileMB}MB)
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
