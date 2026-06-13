import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Loader2, Upload, X, Film, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LessonVideoUploaderProps {
  lessonId: string;
  currentUrl: string | null;
  onUrlChange: (url: string) => void;
}

const BUCKET = "protected-content";

export default function LessonVideoUploader({
  lessonId,
  currentUrl,
  onUrlChange,
}: LessonVideoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<"url" | "upload">(
    currentUrl && !/^https?:\/\//i.test(currentUrl) ? "upload" : "url"
  );

  const isUploadedVideo = !!currentUrl && !/^https?:\/\//i.test(currentUrl);

  const uploadWithProgress = (
    url: string,
    token: string,
    file: File,
    onProgress: (pct: number) => void
  ) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("x-upsert", "true");
      xhr.setRequestHeader(
        "Content-Type",
        file.type || "application/octet-stream"
      );
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload falló (${xhr.status}): ${xhr.responseText}`));
      };
      xhr.onerror = () => reject(new Error("Error de red durante la subida"));
      xhr.send(file);
    });

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

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Archivo muy grande",
        description: "El tamaño máximo es 500MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("No estás autenticado");

      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const allowedExts = ["mp4", "mov", "webm", "avi", "mkv"];
      if (!fileExt || !allowedExts.includes(fileExt)) {
        throw new Error("Formato de video no soportado");
      }

      const fileName = `${lessonId}-${Date.now()}.${fileExt}`;
      const filePath = `${authData.user.id}/lessons/${fileName}`;

      // Use signed upload URL + XHR so we get real upload progress.
      const { data: signed, error: signErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUploadUrl(filePath);
      if (signErr || !signed) throw signErr || new Error("No se pudo iniciar la subida");

      // signed.signedUrl is a full URL we PUT to. token is included for completeness.
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken =
        sessionData.session?.access_token ||
        // fallback to anon key from supabase client (public)
        (supabase as any).supabaseKey ||
        "";

      await uploadWithProgress(signed.signedUrl, accessToken, file, setProgress);

      // Store the storage PATH (not a URL). Access is mediated by get-protected-url.
      onUrlChange(filePath);
      setProgress(100);
      toast({ title: "Video subido correctamente ✅" });
    } catch (err: any) {
      console.error("Upload error:", err);
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

  const handleRemoveVideo = () => {
    onUrlChange("");
    setProgress(0);
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
          onClick={() => setMode("upload")}
        >
          <Upload className="h-4 w-4 mr-1" />
          Subir MP4
        </Button>
      </div>

      {mode === "url" ? (
        <Input
          value={isUploadedVideo ? "" : currentUrl || ""}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      ) : (
        <div className="space-y-2">
          {isUploadedVideo && currentUrl && !uploading ? (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Film className="h-5 w-5 text-primary" />
              <span className="text-sm flex-1 truncate">Video cargado</span>
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
                    Subiendo… {progress}%
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
                    MP4, MOV, WEBM (máx. 500MB)
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
