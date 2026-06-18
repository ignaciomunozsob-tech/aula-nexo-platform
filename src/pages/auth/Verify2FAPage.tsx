import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, RefreshCw } from "lucide-react";

export default function Verify2FAPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Get user info from navigation state
  const userId = location.state?.userId;
  const userEmail = location.state?.email;
  const userName = location.state?.name;

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) {
      throw new Error("No se pudo validar tu sesión. Inicia sesión nuevamente.");
    }
    return accessToken;
  };

  useEffect(() => {
    // If no user info, redirect to login
    if (!userId || !userEmail) {
      navigate("/login");
      return;
    }

    // Send the initial 2FA code on mount (moved here from LoginPage to
    // avoid a race condition where the LoginPage unmounted before the
    // invoke completed, aborting the email send).
    let cancelled = false;
    (async () => {
      try {
        const accessToken = await getAccessToken();
        const { error } = await supabase.functions.invoke("send-2fa-code", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (cancelled) return;
        if (error) {
          console.error("[2FA] Initial send error:", error);
          toast({
            title: "Error al enviar código",
            description: "Usa el botón 'Reenviar código' para intentar de nuevo.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Código enviado",
            description: "Revisa tu correo electrónico",
          });
          setCountdown(60);
        }
      } catch (err: any) {
        if (cancelled) return;
        console.error("[2FA] Initial send error:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userEmail]);

  useEffect(() => {
    // Countdown timer for resend button
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 6) {
      toast({
        title: "Código inválido",
        description: "El código debe tener 6 dígitos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const accessToken = await getAccessToken();
      const { data, error } = await supabase.functions.invoke("verify-2fa-code", {
        body: { code },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error || !data?.success) {
        toast({
          title: "Código inválido o expirado",
          description: data?.error || error?.message || "Usa el último código recibido o solicita uno nuevo.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Verificación exitosa ✅" });
      navigate("/creator-app");
    } catch (error: any) {
      console.error("[2FA] Verification error:", error);
      toast({
        title: "Error de verificación",
        description: "No se pudo verificar el código",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setResending(true);

    try {
      const accessToken = await getAccessToken();
      // Call 2FA function with an explicit auth token so the backend can identify the user.
      const { error } = await supabase.functions.invoke("send-2fa-code", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Código reenviado",
        description: "Revisa tu correo electrónico",
      });

      // Start 60 second countdown before allowing another resend
      setCountdown(60);
    } catch (error: any) {
      console.error("[2FA] Resend error:", error);
      toast({
        title: "Error al reenviar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Verificación de seguridad</h1>
          <p className="text-sm text-muted-foreground">
            Autenticación de dos factores
          </p>
        </div>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 mb-6">
        <p className="text-sm text-muted-foreground">
          Hemos enviado un código de 6 dígitos a{" "}
          <span className="font-medium text-foreground">{userEmail}</span>.
          <br />
          El código expira en 30 minutos.
        </p>
      </div>

      <form onSubmit={verifyCode} className="space-y-4">
        <div className="space-y-2">
          <Label>Código de verificación</Label>
          <Input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="text-center text-2xl tracking-widest font-mono"
            maxLength={6}
            autoComplete="one-time-code"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
          {loading ? "Verificando..." : "Verificar código"}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          ¿No recibiste el código?
        </p>
        <Button
          variant="outline"
          onClick={resendCode}
          disabled={resending || countdown > 0}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
          {countdown > 0 ? `Reenviar en ${countdown}s` : "Reenviar código"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mt-8 text-center">
        La verificación de dos factores protege tu cuenta de accesos no autorizados.
      </p>
    </div>
  );
}
