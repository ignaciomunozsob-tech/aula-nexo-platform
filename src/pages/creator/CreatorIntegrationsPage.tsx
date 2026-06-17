import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle, Calendar, Link2, Loader2, Unplug } from "lucide-react";
import { useGoogleConnection } from "@/hooks/useGoogleConnection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function CreatorIntegrationsPage() {
  const { connection, loading, connect, disconnect, refresh } = useGoogleConnection();
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();

  // Handle OAuth callback redirect status
  useEffect(() => {
    const status = params.get("google");
    if (!status) return;
    if (status === "connected") {
      toast.success("Google Calendar conectado correctamente");
      refresh();
    } else if (status === "error") {
      const detail = params.get("detail");
      toast.error("No se pudo conectar Google", { description: detail || undefined });
    }
    params.delete("google");
    params.delete("detail");
    setParams(params, { replace: true });
  }, [params, setParams, refresh]);

  const handleConnect = async () => {
    setBusy(true);
    try {
      const returnTo = `${window.location.origin}/#/creator-app/integrations`;
      await connect(returnTo);
    } catch (e: any) {
      toast.error("No se pudo iniciar la conexión", { description: e?.message });
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("¿Desconectar tu Google Calendar? Tus eventos ya creados no se eliminarán.")) return;
    setBusy(true);
    try {
      await disconnect();
      toast.success("Google Calendar desconectado");
    } catch (e: any) {
      toast.error("No se pudo desconectar", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integraciones</h1>
        <p className="text-muted-foreground mt-1">
          Conecta tus herramientas externas para automatizar tu trabajo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                Google Calendar
                {connection && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Conectado
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                Necesario para ofrecer sesiones 1:1 y bloquear horarios. También sincroniza tus eventos online y crea links de Google Meet automáticamente.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : connection ? (
            <div className="space-y-4">
              <div className="text-sm">
                <p className="font-medium">{connection.google_email || "Cuenta de Google"}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Conectado el {new Date(connection.connected_at).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <Button variant="outline" onClick={handleDisconnect} disabled={busy}>
                <Unplug className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p className="flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Te pediremos permiso para <strong>crear eventos</strong> en tu calendario y <strong>leer tu disponibilidad</strong>. No accedemos al contenido de eventos pasados.
                  </span>
                </p>
              </div>
              <Button onClick={handleConnect} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                Conectar Google Calendar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
