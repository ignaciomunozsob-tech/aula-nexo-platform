import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Trash2, Plus, FileText, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BUCKET = "course-assets";

export type LessonResourceItem = {
  id: string;
  file_url: string;
  file_name: string;
};

interface Props {
  lessonId: string;
  resources: LessonResourceItem[];
  onChange: (next: LessonResourceItem[]) => void;
}

export default function LessonResourcesEditor({ lessonId, resources, onChange }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const addLink = () => {
    onChange([
      ...resources,
      { id: `new-${Date.now()}`, file_url: "", file_name: "" },
    ]);
  };

  const updateItem = (idx: number, patch: Partial<LessonResourceItem>) => {
    const next = [...resources];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const removeItem = (idx: number) => {
    const next = [...resources];
    next.splice(idx, 1);
    onChange(next);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "Archivo muy grande",
        description: "El tamaño máximo es 50MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("No estás autenticado");

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${authData.user.id}/lesson-resources/${lessonId}-${Date.now()}-${safeName}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);

      onChange([
        ...resources,
        {
          id: `new-${Date.now()}`,
          file_url: data.publicUrl,
          file_name: file.name,
        },
      ]);
      toast({ title: "Archivo subido ✅" });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error al subir archivo",
        description: err?.message || "Intenta nuevamente",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2 border rounded-md p-3 bg-muted/30">
      <Label className="text-xs text-muted-foreground">
        Recursos descargables (archivos o enlaces)
      </Label>

      {resources.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No hay recursos. Agrega un enlace o sube un archivo.
        </p>
      )}

      <div className="space-y-2">
        {resources.map((r, idx) => (
          <div key={r.id} className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <Input
              value={r.file_name}
              onChange={(e) => updateItem(idx, { file_name: e.target.value })}
              placeholder="Nombre"
              className="h-8 text-sm flex-1"
            />
            <Input
              value={r.file_url}
              onChange={(e) => updateItem(idx, { file_url: e.target.value })}
              placeholder="https://..."
              className="h-8 text-sm flex-[2]"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeItem(idx)}
              className="h-8 w-8 text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={addLink}>
          <Link2 className="h-4 w-4 mr-1" />
          Agregar enlace
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-1" />
          )}
          Subir archivo
        </Button>
      </div>
    </div>
  );
}
