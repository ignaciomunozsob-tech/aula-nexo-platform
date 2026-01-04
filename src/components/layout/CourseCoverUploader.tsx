// src/components/layout/CourseCoverUploader.tsx
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type Props = {
  courseId: string;
  currentUrl?: string | null;
  onUploaded?: (publicUrl: string) => void;
};

function extFromFileName(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "jpg";
}

function isValidImageType(type: string) {
  return ["image/jpeg", "image/png", "image/webp"].includes(type);
}

export default function CourseCoverUploader({ courseId, currentUrl, onUploaded }: Props) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const previewUrl = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    return currentUrl ?? null;
  }, [file, currentUrl]);

  // Auto-upload when file is selected
  useEffect(() => {
    if (file) {
      handleUpload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const handleUpload = async () => {
    if (!file) return;

    if (!isValidImageType(file.type)) {
      toast({
        title: "Formato no soportado",
        description: "Usa JPG, PNG o WEBP.",
        variant: "destructive",
      });
      setFile(null);
      return;
    }

    setUploading(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      const user = authData.user;
      if (!user) throw new Error("No estás autenticado");

      const ext = extFromFileName(file.name);
      const path = `${user.id}/courses/${courseId}/cover.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("course-assets")
        .upload(path, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "3600",
        });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from("course-assets")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;

      const { error: updateErr } = await supabase
        .from("courses")
        .update({ cover_image_url: publicUrl })
        .eq("id", courseId);

      if (updateErr) throw updateErr;

      toast({ title: "Portada actualizada ✅" });
      setFile(null);
      onUploaded?.(publicUrl);
    } catch (e: any) {
      toast({
        title: "Error subiendo portada",
        description: e?.message ?? "Intenta nuevamente",
        variant: "destructive",
      });
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <div className="w-44 h-28 rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center relative">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Portada del curso"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs text-muted-foreground px-2 text-center">
              Sin portada
            </span>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <label className="block">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors">
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Subiendo...
                </>
              ) : (
                "Seleccionar imagen"
              )}
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="sr-only"
              disabled={uploading}
            />
          </label>

          <p className="text-xs text-muted-foreground">
            Recomendado: 1280×720 (16:9). Formatos: JPG, PNG o WEBP.
          </p>
        </div>
      </div>
    </div>
  );
}
