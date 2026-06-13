import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_ORIGIN = Deno.env.get("SITE_URL") || "https://novuproject.lovable.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  name: string;
  courseName: string;
  resetPasswordUrl?: string;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeRedirect(url: string | undefined, allowedOrigin: string): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    const a = new URL(allowedOrigin);
    return u.origin === a.origin;
  } catch {
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authenticated caller (creator/admin) to prevent abuse
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const userId = claimsData.claims.sub as string;
    const callerEmail = (claimsData.claims.email as string | undefined)?.toLowerCase();

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
    const isPrivileged = roles.includes("creator") || roles.includes("admin");

    const body: WelcomeEmailRequest = await req.json();
    const { email, name, courseName, resetPasswordUrl } = body || ({} as WelcomeEmailRequest);

    // Validate inputs
    const emailOk = typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
    const nameOk = typeof name === "string" && name.trim().length > 0 && name.length <= 120;
    const courseOk = typeof courseName === "string" && courseName.trim().length > 0 && courseName.length <= 200;
    if (!emailOk || !nameOk || !courseOk) {
      return new Response(JSON.stringify({ error: "Invalid input" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    // Non-privileged callers can only send the welcome email to themselves
    if (!isPrivileged && email.toLowerCase() !== callerEmail) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    if (!isSafeRedirect(resetPasswordUrl, SITE_ORIGIN)) {
      return new Response(JSON.stringify({ error: "Invalid redirect URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeCourse = escapeHtml(courseName);
    const loginUrl = `${SITE_ORIGIN}/login`;
    const setPasswordUrl = resetPasswordUrl || `${SITE_ORIGIN}/forgot-password`;
    const safeSetPasswordUrl = escapeHtml(setPasswordUrl);
    const safeLoginUrl = escapeHtml(loginUrl);

    console.log(`Sending welcome email to ${email} for course: ${courseName}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "NOVU <onboarding@resend.dev>",
        to: [email],
        subject: `¡Bienvenido a tu curso: ${courseName}!`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">¡Bienvenido a NOVU!</h1>
            </div>

            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 18px; margin-top: 0;">Hola <strong>${safeName}</strong>,</p>

              <p>¡Felicidades! Te has inscrito exitosamente al curso:</p>

              <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <h2 style="color: #667eea; margin: 0;">${safeCourse}</h2>
              </div>

              <p>Para acceder a tu curso, primero necesitas establecer tu contraseña:</p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${safeSetPasswordUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Establecer mi contraseña</a>
              </div>

              <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>📧 Tu email de acceso:</strong> ${safeEmail}</p>
                <p style="margin: 0; font-size: 14px; color: #856404;">Haz clic en el botón de arriba para crear tu contraseña de acceso.</p>
              </div>

              <p style="color: #666; font-size: 14px;">Una vez que establezcas tu contraseña, podrás acceder a tu curso iniciando sesión en:</p>

              <p style="text-align: center;">
                <a href="${safeLoginUrl}" style="color: #667eea; text-decoration: underline;">${safeLoginUrl}</a>
              </p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

              <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                © 2024 NOVU. Todos los derechos reservados.
              </p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const data = await res.json();
    console.log("Email response status:", res.status);

    if (!res.ok) {
      throw new Error(data.message || "Error sending email");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error?.message || error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
