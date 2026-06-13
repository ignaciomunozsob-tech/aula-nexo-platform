import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false }, global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || "").trim();
    if (!/^\d{6}$/.test(code)) return json({ error: "Código inválido" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: codes, error: selErr } = await admin
      .from("creator_2fa_codes")
      .select("id")
      .eq("user_id", user.id)
      .eq("code", code)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (selErr) {
      console.error("[verify-2fa-code] select error", selErr);
      return json({ error: "No se pudo verificar el código" }, 500);
    }
    if (!codes || codes.length === 0) {
      return json({ error: "Código inválido o expirado" }, 400);
    }

    const { error: updErr } = await admin
      .from("creator_2fa_codes")
      .update({ used: true })
      .eq("id", codes[0].id);
    if (updErr) {
      console.error("[verify-2fa-code] mark used error", updErr);
      return json({ error: "No se pudo verificar el código" }, 500);
    }

    const { error: profErr } = await admin
      .from("profiles")
      .update({ last_2fa_verified_at: new Date().toISOString() })
      .eq("id", user.id);
    if (profErr) {
      console.error("[verify-2fa-code] profile update error", profErr);
      return json({ error: "No se pudo completar la verificación" }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error("[verify-2fa-code] unexpected", e);
    return json({ error: "Error inesperado" }, 500);
  }
});
