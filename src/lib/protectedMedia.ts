import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve a media URL for playback/download.
 * - Absolute URLs (http/https, including YouTube) are returned as-is.
 * - Storage paths inside the private `protected-content` bucket are exchanged
 *   for a short-lived signed URL via the `get-protected-url` edge function.
 */
export async function resolveProtectedUrl(value: string | null | undefined): Promise<string> {
  if (!value) return "";
  const v = value.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;

  const { data, error } = await supabase.functions.invoke("get-protected-url", {
    body: { path: v },
  });
  if (error) throw error;
  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new Error("No se pudo obtener el archivo protegido");
  return url;
}
