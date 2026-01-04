import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
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
        // MUY IMPORTANTE para debug real:
        console.error("[LOGIN_ERROR]", error);

        toast({
          title: "No se pudo iniciar sesión",
          description: friendlyAuthError((error as any)?.message),
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Sesión iniciada ✅" });
      navigate("/app");
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
          <Label>Contraseña</Label>
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
        Si te sigue diciendo “incorrectos”, abre consola y mira <code>[LOGIN_ERROR]</code> para ver el motivo real.
      </p>
    </div>
  );
}
