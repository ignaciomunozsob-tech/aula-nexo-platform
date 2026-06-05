import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, X, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  courseId: string;
  currentUrl: string | null;
  onUrlChange: (url: string) => void;
}

const BUCKET = "course-assets";
const ALLOWED = ["pdf", "doc", "docx", "ppt", "pptx", "png", "jpg", "jpeg"];

export default function CertificateTemplateUploader({
  courseId,
  currentUrl,
  onUrlChange,
}: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ALLOWED.includes(ext)) {
      toast({
        title: "Formato no soportado",
        description: `Sube ${ALLOWED.join(", ").toUpperCase()}`,
        variant: "destructive",
      });
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast({
        title: "Archivo muy grande",
        description: "Máximo 25MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("No autenticado");

      const path = `${auth.user.id}/certificates/${courseId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onUrlChange(data.publicUrl);
      toast({ title: "Plantilla subida ✅" });
    } catch (err: any) {
      toast({
        title: "Error al subir",
        description: err?.message || "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {currentUrl ? (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <FileText className="h-5 w-5 text-primary" />
          <span className="text-sm flex-1 truncate">Plantilla cargada</span>
          <Button type="button" variant="ghost" size="sm" asChild>
            <a href={currentUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onUrlChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed rounded-lg p-4 text-center">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
            onChange={upload}
            className="hidden"
            disabled={uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
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
                Subir plantilla del certificado
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            PDF, DOCX, PPTX, PNG o JPG (máx. 25MB). Idealmente un archivo editable
            (DOCX/PPTX) para poder personalizar el nombre del alumno.
          </p>
        </div>
      )}
    </div>
  );
}
