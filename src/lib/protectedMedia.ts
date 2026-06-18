import { supabase } from "@/integrations/supabase/client";

export type ProtectedKind = "lesson_video" | "lesson_resource" | "ebook";

/**
 * Get a short-lived signed URL for protected content.
 * The client never sees the underlying storage path — it only passes the
 * resource identifier (and kind), and the `get-protected-url` edge function
 * looks up the path server-side after validating access.
 *
 * Returns "" when no id is provided. For absolute URLs returned by the
 * server (e.g. YouTube links stored as the lesson video) the value is
 * returned as-is.
 */
export async function resolveProtectedUrl(
  kind: ProtectedKind,
  id: string | null | undefined,
): Promise<string> {
  if (!id) return "";
  const trimmed = id.trim();
  if (!trimmed) return "";

  const { data, error } = await supabase.functions.invoke("get-protected-url", {
    body: { kind, id: trimmed },
  });
  if (error) throw error;
  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new Error("No se pudo obtener el archivo protegido");
  return url;
}
