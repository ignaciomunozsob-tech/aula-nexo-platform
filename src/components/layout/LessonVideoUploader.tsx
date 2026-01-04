import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, Film, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface LessonVideoUploaderProps {
  lessonId: string;
  currentUrl: string | null;
  onUrlChange: (url: string) => void;
}

export default function LessonVideoUploader({
  lessonId,
  currentUrl,
  onUrlChange,
}: LessonVideoUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"url" | "upload">(
    currentUrl?.includes("supabase") ? "upload" : "url"
  );

  const isUploadedVideo = currentUrl?.includes("supabase") || currentUrl?.includes("course-assets");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("video/")) {
      toast({
        title: "Archivo no válido",
        description: "Solo se permiten archivos de video (MP4, MOV, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 500MB)
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

    try {
      // Get current user for namespace
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        throw new Error("No estás autenticado");
      }

      // Validate file extension
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const allowedExts = ['mp4', 'mov', 'webm', 'avi', 'mkv'];
      if (!fileExt || !allowedExts.includes(fileExt)) {
        throw new Error("Formato de video no soportado");
      }

      const fileName = `${lessonId}-${Date.now()}.${fileExt}`;
      // Use user namespace for storage security
      const filePath = `${authData.user.id}/lessons/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("course-assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("course-assets")
        .getPublicUrl(filePath);

      onUrlChange(data.publicUrl);
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
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
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
          value={isUploadedVideo ? "" : (currentUrl || "")}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
      ) : (
        <div className="space-y-2">
          {isUploadedVideo && currentUrl ? (
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
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar video
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                MP4, MOV, WEBM (máx. 500MB)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
