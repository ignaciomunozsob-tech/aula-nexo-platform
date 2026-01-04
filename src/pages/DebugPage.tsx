// src/pages/DebugPage.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEnv } from "@/lib/env";
import { Button } from "@/components/ui/button";

export default function DebugPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [dbPing, setDbPing] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  const env = (() => {
    try {
      const e = getEnv();
      return {
        supabaseUrl: e.supabaseUrl,
        keyPreview: e.supabaseKey.slice(0, 14) + "…" + e.supabaseKey.slice(-6),
      };
    } catch (e: any) {
      return { supabaseUrl: "ERROR", keyPreview: "ERROR", envError: e?.message || String(e) };
    }
  })();

  useEffect(() => {
    (async () => {
      try {
        const { data: s, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;
        setSessionInfo(s);

        const { data, error } = await supabase.from("courses").select("id").limit(1);
        if (error) throw error;
        setDbPing({ ok: true, sample: data });
      } catch (e: any) {
        setErr(e?.message || String(e));
      }
    })();
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-4">
      <h1 className="text-2xl font-bold">Debug</h1>

      {err && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <div className="font-semibold">Error</div>
          <div className="text-sm opacity-80 mt-1">{err}</div>
        </div>
      )}

      <div className="rounded-lg border p-4 space-y-2">
        <div className="font-semibold">Env</div>
        {"envError" in env && (
          <div className="text-sm text-destructive">{(env as any).envError}</div>
        )}
        <div className="text-sm">
          <div>VITE_SUPABASE_URL: {env.supabaseUrl}</div>
          <div>VITE_SUPABASE_*KEY: {env.keyPreview}</div>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <div className="font-semibold">Auth session</div>
        <pre className="text-xs bg-muted/20 border rounded p-3 overflow-auto">
          {JSON.stringify(sessionInfo, null, 2)}
        </pre>
      </div>

      <div className="rounded-lg border p-4 space-y-2">
        <div className="font-semibold">DB ping (courses)</div>
        <pre className="text-xs bg-muted/20 border rounded p-3 overflow-auto">
          {JSON.stringify(dbPing, null, 2)}
        </pre>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()}>Recargar</Button>
        <Button
          variant="outline"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.reload();
          }}
        >
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
