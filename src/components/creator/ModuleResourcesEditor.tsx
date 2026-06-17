import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useMyPlan } from "@/hooks/useMyPlan";

const BUCKET = "course-assets";
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.csv,.ods,.odt";

interface Props {
  moduleId: string;
  courseId: string;
}

export default function ModuleResourcesEditor({ moduleId, courseId }: Props) {
  const qc = useQueryClient();
  const { data: plan } = useMyPlan();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const maxMB = plan?.maxFileMB ?? 500;
  const realModuleId = moduleId?.startsWith("new-") ? null : moduleId;

  const { data: resources = [] } = useQuery({
    queryKey: ["module-resources", realModuleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("module_resources").select("*")
        .eq("module_id", realModuleId).order("order_index");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!realModuleId,
  });

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!realModuleId) { toast.error("Guarda el módulo primero"); return; }
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`Archivo muy grande`, { description: `Máximo ${maxMB}MB en tu plan` });
      return;
    }
    setUploading(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `module-resources/${courseId}/${realModuleId}/${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      const { error } = await (supabase as any).from("module_resources").insert({
        module_id: realModuleId, course_id: courseId, title: file.name,
        file_url: url, file_size_bytes: file.size, mime_type: file.type,
        order_index: resources.length,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["module-resources", realModuleId] });
      toast.success("Archivo subido");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from("module_resources").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["module-resources", realModuleId] });
  };

  return (
    <div className="space-y-2 border rounded-md p-3 bg-muted/30">
      <Label className="text-xs text-muted-foreground">
        Recursos del módulo · PDF, imagen, Word, Excel · Máx. {maxMB}MB
      </Label>

      {!realModuleId && (
        <p className="text-xs text-muted-foreground italic">Guarda el módulo para poder subir archivos.</p>
      )}

      <div className="space-y-1">
        {resources.map((r: any) => (
          <div key={r.id} className="flex items-center gap-2 bg-background border rounded-md p-2 text-sm">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <a href={r.file_url} target="_blank" rel="noreferrer" className="flex-1 truncate hover:underline">{r.title}</a>
            <Button variant="ghost" size="icon" onClick={() => remove(r.id)} className="h-7 w-7 text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <input ref={fileInputRef} type="file" accept={ACCEPT} onChange={upload} className="hidden" />
      <Button type="button" variant="outline" size="sm" disabled={uploading || !realModuleId}
        onClick={() => fileInputRef.current?.click()}>
        {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
        Subir archivo
      </Button>
    </div>
  );
}
