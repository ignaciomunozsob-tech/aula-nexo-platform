import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, courseName, resetPasswordUrl }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to ${email} for course: ${courseName}`);

    const loginUrl = `${Deno.env.get("SITE_URL") || "https://aulanexo.lovable.app"}/login`;
    const setPasswordUrl = resetPasswordUrl || `${Deno.env.get("SITE_URL") || "https://aulanexo.lovable.app"}/forgot-password`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "AulaNexo <onboarding@resend.dev>",
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
              <h1 style="color: white; margin: 0; font-size: 28px;">¡Bienvenido a AulaNexo!</h1>
            </div>
            
            <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
              <p style="font-size: 18px; margin-top: 0;">Hola <strong>${name}</strong>,</p>
              
              <p>¡Felicidades! Te has inscrito exitosamente al curso:</p>
              
              <div style="background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <h2 style="color: #667eea; margin: 0;">${courseName}</h2>
              </div>
              
              <p>Para acceder a tu curso, primero necesitas establecer tu contraseña:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${setPasswordUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">Establecer mi contraseña</a>
              </div>
              
              <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 0 0 10px 0;"><strong>📧 Tu email de acceso:</strong> ${email}</p>
                <p style="margin: 0; font-size: 14px; color: #856404;">Haz clic en el botón de arriba para crear tu contraseña de acceso.</p>
              </div>
              
              <p style="color: #666; font-size: 14px;">Una vez que establezcas tu contraseña, podrás acceder a tu curso iniciando sesión en:</p>
              
              <p style="text-align: center;">
                <a href="${loginUrl}" style="color: #667eea; text-decoration: underline;">${loginUrl}</a>
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
                © 2024 AulaNexo. Todos los derechos reservados.
              </p>
            </div>
          </body>
          </html>
        `,
      }),
    });

    const data = await res.json();
    console.log("Email response:", data);

    if (!res.ok) {
      throw new Error(data.message || "Error sending email");
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
