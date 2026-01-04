import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Send2FARequest {
  userId: string;
  email: string;
  userName?: string;
}

function generateCode(): string {
  // Generate a 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[send-2fa-code] Request received");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, userName }: Send2FARequest = await req.json();
    
    console.log("[send-2fa-code] Processing for user:", userId, email);

    if (!userId || !email) {
      console.error("[send-2fa-code] Missing userId or email");
      return new Response(
        JSON.stringify({ error: "userId and email are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Generate 6-digit code
    const code = generateCode();
    
    // Code expires in 30 minutes
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    console.log("[send-2fa-code] Generated code, expires at:", expiresAt.toISOString());

    // Invalidate any existing unused codes for this user
    await supabaseAdmin
      .from("creator_2fa_codes")
      .update({ used: true })
      .eq("user_id", userId)
      .eq("used", false);

    // Insert new code
    const { error: insertError } = await supabaseAdmin
      .from("creator_2fa_codes")
      .insert({
        user_id: userId,
        code: code,
        expires_at: expiresAt.toISOString(),
        used: false,
      });

    if (insertError) {
      console.error("[send-2fa-code] Error inserting code:", insertError);
      return new Response(
        JSON.stringify({ error: "Error al generar código de verificación" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email with the code
    const emailResponse = await resend.emails.send({
      from: "AulaNexo <onboarding@resend.dev>",
      to: [email],
      subject: "Código de verificación - AulaNexo",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h1 style="color: #004aad; margin: 0 0 24px 0; font-size: 24px;">
                Código de Verificación
              </h1>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hola${userName ? ` ${userName}` : ''},
              </p>
              
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hemos detectado un inicio de sesión en tu cuenta de creador. Usa el siguiente código para verificar tu identidad:
              </p>
              
              <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
                <span style="font-family: monospace; font-size: 32px; font-weight: bold; color: #004aad; letter-spacing: 8px;">
                  ${code}
                </span>
              </div>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
                ⏱️ Este código expira en <strong>30 minutos</strong>.
              </p>
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0;">
                Si no intentaste iniciar sesión, por favor ignora este correo o contacta a soporte.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
              
              <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
                Este es un correo automático de AulaNexo
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("[send-2fa-code] Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("[send-2fa-code] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
