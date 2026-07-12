import { useState, useRef, useEffect } from "react";
import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, X, Link2, Lock, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMyPlan } from "@/hooks/useMyPlan";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { resolveProtectedUrl } from "@/lib/protectedMedia";

interface LessonVideoUploaderProps {
  lessonId: string;
  currentUrl: string | null;
  onUrlChange: (url: string) => void;
}

// The uploader has two modes: paste a YouTube/Vimeo URL, or upload an MP4 that
// the platform hosts (behind the scenes on Bunny Stream; the UI never surfaces
// the word "Bunny"). Once a video is ready, we render an actual inline player
// so the creator sees exactly what the student will see.
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
  const [hostedStatus, setHostedStatus] = useState<
    "idle" | "uploading" | "processing" | "ready" | "error"
  >("idle");
  const [hostedVideoId, setHostedVideoId] = useState<string | null>(null);
  const [legacyFilename, setLegacyFilename] = useState<string | null>(null);
  const [mode, setMode] = useState<"url" | "upload">(() => {
    if (!currentUrl) return "upload";
    return /youtube\.com|youtu\.be|vimeo\.com/i.test(currentUrl) ? "url" : "upload";
  });

  const isExternalUrl =
    !!currentUrl && /youtube\.com|youtu\.be|vimeo\.com/i.test(currentUrl);

  // Library id (public, used to build the embed URL).
  const { data: embedConfig } = useQuery({
    queryKey: ["bunny-embed-config"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("bunny-embed-config");
      return (data ?? {}) as { libraryId?: string };
    },
    staleTime: 60 * 60 * 1000,
  });
  const libraryId = embedConfig?.libraryId;

  // Signed URL for legacy videos stored in our own bucket.
  const { data: legacySignedUrl } = useQuery({
    queryKey: ["lesson-legacy-video", lessonId, legacyFilename],
    queryFn: () => resolveProtectedUrl("lesson_video", lessonId),
    enabled: !!legacyFilename,
    staleTime: 50 * 60 * 1000,
  });

  // Load current lesson state
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("lessons")
        .select("bunny_status, bunny_video_id, video_source, video_url")
        .eq("id", lessonId)
        .maybeSingle();
      if (!alive || !data) return;
      if (data.video_source === "bunny" && data.bunny_video_id) {
        setHostedStatus(data.bunny_status || "ready");
        setHostedVideoId(data.bunny_video_id);
        setLegacyFilename(null);
        setMode("upload");
      } else if (
        data.video_url &&
        !/^https?:\/\//i.test(data.video_url) &&
        !data.video_url.startsWith("bunny:")
      ) {
        setLegacyFilename(data.video_url.split("/").pop() || "video");
        setMode("upload");
      }
    })();
    return () => {
      alive = false;
    };
  }, [lessonId]);

  // Poll status while processing
  useEffect(() => {
    if (hostedStatus !== "processing" && hostedStatus !== "uploading") return;
    let alive = true;
    const t = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("bunny-video-status", {
          body: { lessonId },
        });
        if (!alive) return;
        const s = (data as any)?.status;
        if (s === "ready") {
          setHostedStatus("ready");
          toast({ title: "Video listo ✅" });
        } else if (s === "error") {
          setHostedStatus("error");
          toast({ title: "Error al procesar el video", variant: "destructive" });
        } else if (s) {
          setHostedStatus(s);
        }
      } catch {}
    }, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [hostedStatus, lessonId, toast]);

  const startUpload = async (file: File) => {
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
    setHostedStatus("uploading");

    try {
      const { data, error } = await supabase.functions.invoke("bunny-create-video", {
        body: { lessonId, title: file.name },
      });
      if (error || !data) throw error || new Error("No se pudo iniciar la subida");
      const {
        videoId,
        libraryId: libId,
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
            LibraryId: libId,
          },
          metadata: { filetype: file.type, title: file.name },
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
      setHostedStatus("processing");
      setHostedVideoId(videoId);
      setLegacyFilename(null);
      onUrlChange(`bunny:${videoId}`);
      toast({ title: "Video subido — procesando…" });
    } catch (err: any) {
      console.error("Upload error:", err);
      setHostedStatus("error");
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) startUpload(file);
  };

  const handleRemoveVideo = async () => {
    const ok = window.confirm(
      "¿Eliminar el video de esta lección? Esta acción no se puede deshacer.",
    );
    if (!ok) return;
    onUrlChange("");
    setProgress(0);
    setHostedStatus("idle");
    setHostedVideoId(null);
    setLegacyFilename(null);
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

  const hasHostedVideo =
    hostedStatus === "ready" && !!hostedVideoId && !uploading;
  const hasLegacyVideo = !!legacyFilename && !uploading;
  const isProcessing = hostedStatus === "processing" && !uploading;

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
                description:
                  "La subida directa de videos está disponible desde el Plan Creador.",
                variant: "destructive",
              });
              return;
            }
            setMode("upload");
          }}
          title={!allowDirectVideo ? "Disponible desde Plan Creador" : undefined}
        >
          {allowDirectVideo ? (
            <Upload className="h-4 w-4 mr-1" />
          ) : (
            <Lock className="h-4 w-4 mr-1" />
          )}
          Subir video
        </Button>
      </div>

      {!allowDirectVideo && mode === "upload" && (
        <div className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-md p-2">
          La subida directa de videos requiere{" "}
          <Link to="/precios" className="underline font-semibold">
            Plan Creador
          </Link>
          . Usa una URL de YouTube o Vimeo en el plan Gratis.
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
          {hasHostedVideo && libraryId ? (
            <div className="space-y-2">
              <div
                className="bg-black overflow-hidden rounded-lg"
                style={{ aspectRatio: "16 / 9" }}
              >
                <iframe
                  src={`https://iframe.mediadelivery.net/embed/${libraryId}/${hostedVideoId}`}
                  loading="lazy"
                  className="w-full h-full"
                  style={{ border: "none" }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reemplazar video
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveVideo}
                >
                  <X className="h-4 w-4 mr-1" />
                  Quitar
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          ) : hasLegacyVideo ? (
            <div className="space-y-2">
              <div
                className="bg-black overflow-hidden rounded-lg"
                style={{ aspectRatio: "16 / 9" }}
              >
                {legacySignedUrl ? (
                  <video
                    src={legacySignedUrl}
                    controls
                    className="w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/70 text-sm">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Cargando video…
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reemplazar video
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveVideo}
                >
                  <X className="h-4 w-4 mr-1" />
                  Quitar
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            </div>
          ) : isProcessing ? (
            <div
              className="bg-black overflow-hidden rounded-lg flex flex-col items-center justify-center gap-3 text-white/80 text-sm"
              style={{ aspectRatio: "16 / 9" }}
            >
              <Loader2 className="h-6 w-6 animate-spin" />
              Tu video se está procesando…
              <button
                type="button"
                className="text-xs underline opacity-70 hover:opacity-100"
                onClick={handleRemoveVideo}
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-6 text-center space-y-3">
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
                    Subiendo video… {progress}%
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
