import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function friendlyAuthError(message?: string) {
  const msg = (message || "").toLowerCase();

  // Supabase típicos
  if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
    return "Tu email aún no está confirmado. Confírmalo en Supabase (Authentication → Users) o desactiva la confirmación por email.";
  }
  if (msg.includes("invalid login credentials")) {
    return "Email o contraseña incorrectos (o el usuario no tiene contraseña configurada).";
  }
  if (msg.includes("invalid api key") || msg.includes("jwt") || msg.includes("api key")) {
    return "Tu llave de Supabase está incorrecta o no está cargando. Revisa VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY/ANON_KEY.";
  }
  if (msg.includes("fetch") || msg.includes("network")) {
    return "Error de red al conectar con Supabase. Revisa tu URL/keys y la consola.";
  }

  return message || "No se pudo iniciar sesión.";
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email.trim(), password);

      if (error) {
        console.error("[LOGIN_ERROR]", error);

        toast({
          title: "No se pudo iniciar sesión",
          description: friendlyAuthError((error as any)?.message),
          variant: "destructive",
        });
        return;
      }

      // Get user data
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "No se pudo obtener información del usuario",
          variant: "destructive",
        });
        return;
      }

      // Check if user needs to change password
      const needsPasswordChange = user.user_metadata?.needs_password_change;

      if (needsPasswordChange) {
        toast({ title: "Por favor, establece tu nueva contraseña" });
        navigate("/reset-password");
        return;
      }

      // Check if user is a creator
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, name")
        .eq("id", user.id)
        .single();

      if (profile?.role === "creator") {
        // Send 2FA code for creators
        toast({ 
          title: "Verificación de seguridad",
          description: "Enviando código de verificación a tu correo..." 
        });

        // Call 2FA function - user info is extracted from the auth token on server-side
        const { error: sendError } = await supabase.functions.invoke("send-2fa-code");

        if (sendError) {
          console.error("[2FA] Error sending code:", sendError);
          toast({
            title: "Error al enviar código",
            description: "No se pudo enviar el código de verificación. Intenta de nuevo.",
            variant: "destructive",
          });
          // Sign out since 2FA failed
          await supabase.auth.signOut();
          return;
        }

        // Navigate to 2FA verification page
        navigate("/verify-2fa", {
          state: {
            userId: user.id,
            email: user.email,
            name: profile.name,
          },
        });
      } else {
        // Students can login directly
        toast({ title: "Sesión iniciada ✅" });
        navigate("/app");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold">Iniciar sesión</h1>
      <p className="text-sm text-muted-foreground mt-1">
        ¿No tienes cuenta?{" "}
        <Link className="text-primary hover:underline" to="/signup">
          Crear cuenta
        </Link>
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Contraseña</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground mt-6">
        Si te sigue diciendo "incorrectos", abre consola y mira <code>[LOGIN_ERROR]</code> para ver el motivo real.
      </p>
    </div>
  );
}
