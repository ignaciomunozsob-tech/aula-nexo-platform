import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { RoleChoiceDialog } from "@/components/auth/RoleChoiceDialog";

async function handleGoogleSignIn(toast: ReturnType<typeof useToast>["toast"]) {
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin,
  });
  if (result.error) {
    toast({ title: "Error con Google", description: result.error.message, variant: "destructive" });
  }
}

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
  const [showPassword, setShowPassword] = useState(false);

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

      // Check if user is a creator (role now lives in user_roles)
      const [{ data: profile }, { data: role }] = await Promise.all([
        supabase.from("profiles").select("name").eq("id", user.id).single(),
        supabase.rpc("get_user_role", { _user_id: user.id }),
      ]);

      if (role === "creator") {
        // Navigate to 2FA verification page; the code is sent from there
        // to avoid a race where this component unmounts (due to auth state
        // change) and the in-flight invoke gets aborted before completing.
        navigate("/verify-2fa", {
          state: {
            userId: user.id,
            email: user.email,
            name: profile?.name,
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

      <div className="mt-8 space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleGoogleSignIn(toast)}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">o</span>
          </div>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">

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
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Ingresando..." : "Ingresar"}
        </Button>
      </form>
    </div>
  );
}
