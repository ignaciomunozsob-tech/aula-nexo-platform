import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if user has a valid session (came from temp password login)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if user needs to change password (has temp_password flag)
        const needsPasswordChange = session.user.user_metadata?.needs_password_change;
        setIsValidSession(!!needsPasswordChange);
      }
      setChecking(false);
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
        data: { needs_password_change: false }
      });

      if (error) throw error;

      toast({ title: "¡Contraseña actualizada! 🎉" });
      navigate("/app/my-courses");
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "No se pudo actualizar la contraseña",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
          <p className="font-semibold">Sesión no válida</p>
          <p className="text-sm opacity-80 mt-1">
            Esta página es solo para usuarios que necesitan cambiar su contraseña temporal.
          </p>
          <Button className="mt-4" onClick={() => navigate("/login")}>
            Ir a Iniciar Sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Establece tu contraseña</h1>
        <p className="text-muted-foreground mt-2">
          Por favor, crea una contraseña segura para tu cuenta
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Nueva contraseña</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Confirmar contraseña</Label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            minLength={6}
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Guardar contraseña
        </Button>
      </form>
    </div>
  );
}
