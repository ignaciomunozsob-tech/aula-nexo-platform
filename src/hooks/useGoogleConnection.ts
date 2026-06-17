import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GoogleConnection {
  google_email: string | null;
  calendar_id: string;
  connected_at: string;
}

export function useGoogleConnection() {
  const [connection, setConnection] = useState<GoogleConnection | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_my_google_connection");
    if (error) {
      console.error("get_my_google_connection error", error);
      setConnection(null);
    } else {
      const row = Array.isArray(data) ? data[0] : data;
      setConnection(row ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const connect = useCallback(async (returnTo: string) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) throw new Error("not_authenticated");
    const res = await fetch(
      "https://oahdxazzbqsdgfwwqbaj.supabase.co/functions/v1/google-oauth-start",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ return_to: returnTo }),
      },
    );
    const body = await res.json();
    if (!res.ok || !body?.authorize_url) throw new Error(body?.error || "start_failed");
    window.location.href = body.authorize_url;
  }, []);

  const disconnect = useCallback(async () => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) throw new Error("not_authenticated");
    const res = await fetch(
      "https://oahdxazzbqsdgfwwqbaj.supabase.co/functions/v1/google-disconnect",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || "disconnect_failed");
    }
    await refresh();
  }, [refresh]);

  return { connection, loading, refresh, connect, disconnect };
}
