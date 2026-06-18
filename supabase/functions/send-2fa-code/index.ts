import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// In-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(userId);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (record.count >= RATE_LIMIT_MAX) return true;
  record.count++;
  return false;
}

function generateCode(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String((arr[0] % 900000) + 100000);
}

Deno.serve(async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: authUser }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Invalid authentication token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userId = authUser.id;
    const email = authUser.email;
    if (!email) {
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (isRateLimited(userId)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: roleRows, error: rolesError } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", userId);
    if (rolesError) {
      return new Response(JSON.stringify({ error: "Unable to verify user role" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
    if (!roles.includes("creator") && !roles.includes("admin")) {
      return new Response(JSON.stringify({ error: "2FA is only required for creators" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("name").eq("id", userId).maybeSingle();

    const { data: activeCodes, error: activeCodeError } = await supabaseAdmin
      .from("creator_2fa_codes")
      .select("code, expires_at")
      .eq("user_id", userId)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (activeCodeError) {
      console.error("[send-2fa-code] Error loading active code:", activeCodeError);
      return new Response(JSON.stringify({ error: "Error al generar código de verificación" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const existingCode = activeCodes?.[0];
    const code = existingCode?.code ?? generateCode();
    const expiresAt = existingCode?.expires_at
      ? new Date(existingCode.expires_at)
      : new Date(Date.now() + 30 * 60 * 1000);

    if (!existingCode) {
      const { error: insertError } = await supabaseAdmin
        .from("creator_2fa_codes")
        .insert({ user_id: userId, code, expires_at: expiresAt.toISOString(), used: false });

      if (insertError) {
        console.error("[send-2fa-code] Error inserting code:", insertError);
        return new Response(JSON.stringify({ error: "Error al generar código de verificación" }), {
          status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Send through Lovable Emails (queued, branded)
    const { error: invokeError } = await supabaseAdmin.functions.invoke(
      "send-transactional-email",
      {
        body: {
          templateName: "2fa-code",
          recipientEmail: email,
          idempotencyKey: `2fa-${userId}-${expiresAt.getTime()}`,
          templateData: { name: profile?.name ?? undefined, code },
        },
      }
    );

    if (invokeError) {
      console.error("[send-2fa-code] Failed to enqueue email:", invokeError);
      return new Response(JSON.stringify({ error: "Error al enviar el código" }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ success: true, message: "Código enviado" }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("[send-2fa-code] Error:", error);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
