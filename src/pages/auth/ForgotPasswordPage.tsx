import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingresa tu email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/#/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setSent(true);
      toast({ title: "Correo enviado ✅" });
    } catch (err: any) {
      console.error("[FORGOT_PASSWORD_ERROR]", err);
      toast({
        title: "Error",
        description: err?.message || "No se pudo enviar el correo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold">Revisa tu correo</h1>
          <p className="text-muted-foreground mt-2">
            Hemos enviado un enlace para restablecer tu contraseña a <strong>{email}</strong>
          </p>
          <p className="text-sm text-muted-foreground mt-4">
            Si no ves el correo, revisa tu carpeta de spam.
          </p>
          <Link to="/login">
            <Button variant="outline" className="mt-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al inicio de sesión
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">¿Olvidaste tu contraseña?</h1>
        <p className="text-muted-foreground mt-2">
          Ingresa tu email y te enviaremos un enlace para restablecerla
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Enviar enlace
        </Button>
      </form>

      <div className="text-center mt-6">
        <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4 inline mr-1" />
          Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}
