// src/components/layout/CourseCoverUploader.tsx
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

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

  const handleUpload = async () => {
    if (!file) return;

    if (!isValidImageType(file.type)) {
      toast({
        title: "Formato no soportado",
        description: "Usa JPG, PNG o WEBP.",
        variant: "destructive",
      });
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
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-4">
        <div className="w-44 h-28 rounded-lg border border-border bg-muted overflow-hidden flex items-center justify-center">
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
        </div>

        <div className="flex-1 space-y-2">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />

          <div className="flex gap-2">
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "Subiendo..." : "Subir portada"}
            </Button>

            {file && (
              <Button variant="outline" onClick={() => setFile(null)} disabled={uploading}>
                Cancelar
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Recomendado: 1280×720 (16:9). Formatos: JPG, PNG o WEBP.
          </p>
        </div>
      </div>
    </div>
  );
}
