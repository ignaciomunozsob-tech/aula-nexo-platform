import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle, Calendar, Link2, Loader2, Unplug, BarChart3, Pencil, Trash2 } from "lucide-react";
import { useGoogleConnection } from "@/hooks/useGoogleConnection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export default function CreatorIntegrationsPage() {
  const { connection, loading, connect, disconnect, refresh } = useGoogleConnection();
  const { profile } = useAuth();
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();

  // Meta Pixel state
  const [pixelId, setPixelId] = useState<string | null>(null);
  const [pixelLoading, setPixelLoading] = useState(true);
  const [pixelDialogOpen, setPixelDialogOpen] = useState(false);
  const [pixelInput, setPixelInput] = useState("");
  const [pixelSaving, setPixelSaving] = useState(false);

  const loadPixel = async () => {
    setPixelLoading(true);
    const { data } = await supabase.rpc("get_my_meta_pixel_id");
    const val = (data as string | null) ?? null;
    setPixelId(val);
    setPixelInput(val ?? "");
    setPixelLoading(false);
  };

  useEffect(() => {
    loadPixel();
  }, []);

  const savePixel = async (newValue: string | null) => {
    if (!profile?.id) return;
    setPixelSaving(true);
    try {
      const clean = newValue?.trim() || null;
      if (clean && !/^\d{6,20}$/.test(clean)) {
        toast.error("ID inválido", { description: "El Pixel ID debe ser numérico (6–20 dígitos)." });
        setPixelSaving(false);
        return;
      }
      const { error } = await supabase
        .from("profiles")
        .update({ meta_pixel_id: clean })
        .eq("id", profile.id);
      if (error) throw error;
      setPixelId(clean);
      setPixelDialogOpen(false);
      toast.success(clean ? "Meta Pixel guardado" : "Meta Pixel eliminado");
    } catch (e: any) {
      toast.error("No se pudo guardar", { description: e?.message });
    } finally {
      setPixelSaving(false);
    }
  };

  const handleRemovePixel = async () => {
    if (!confirm("¿Eliminar el Meta Pixel? Dejaremos de enviar eventos a tu cuenta de Ads.")) return;
    await savePixel(null);
  };

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
      const returnTo = `${window.location.origin}/creator-app/integrations`;
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
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integraciones</h1>
        <p className="text-muted-foreground mt-1">
          Conecta tus herramientas externas para automatizar tu trabajo.
        </p>
      </div>

      {/* Google Calendar */}
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
                Necesario para ofrecer servicios y bloquear horarios. También sincroniza tus eventos online y crea links de Google Meet automáticamente.
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

      {/* Meta Pixel */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                Meta Pixel (Facebook / Instagram Ads)
                {pixelId && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Activo
                  </span>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                Rastrea automáticamente a quienes visitan tu perfil, tus productos (cursos, ebooks, eventos, sesiones), inician un checkout y compran. Eventos: <strong>PageView</strong>, <strong>ViewContent</strong>, <strong>InitiateCheckout</strong> y <strong>Purchase</strong> con monto en CLP.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pixelLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
            </div>
          ) : pixelId ? (
            <div className="space-y-4">
              <div className="text-sm">
                <p className="font-medium font-mono">{pixelId}</p>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Se dispara en todas tus páginas públicas y checkout.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => { setPixelInput(pixelId); setPixelDialogOpen(true); }}>
                  <Pencil className="h-4 w-4 mr-2" /> Editar
                </Button>
                <Button variant="outline" onClick={handleRemovePixel} disabled={pixelSaving}>
                  <Trash2 className="h-4 w-4 mr-2" /> Eliminar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Obtén tu ID en{" "}
                    <a
                      href="https://business.facebook.com/events_manager2"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Meta Events Manager
                    </a>{" "}
                    → Conjuntos de datos → tu Pixel → copia el ID numérico.
                  </span>
                </p>
              </div>
              <Button onClick={() => { setPixelInput(""); setPixelDialogOpen(true); }}>
                <Link2 className="h-4 w-4 mr-2" />
                Agregar Meta Pixel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={pixelDialogOpen} onOpenChange={setPixelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pixelId ? "Editar Meta Pixel" : "Agregar Meta Pixel"}</DialogTitle>
            <DialogDescription>
              Pega el ID numérico de tu Pixel de Meta. Empezaremos a enviar eventos inmediatamente en todas tus páginas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="pixel-id">ID del Pixel</Label>
            <Input
              id="pixel-id"
              value={pixelInput}
              onChange={(e) => setPixelInput(e.target.value.replace(/\D/g, ""))}
              placeholder="Ej: 1234567890123456"
              inputMode="numeric"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Solo dígitos. Lo encuentras en Meta Events Manager → Conjuntos de datos.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPixelDialogOpen(false)} disabled={pixelSaving}>
              Cancelar
            </Button>
            <Button onClick={() => savePixel(pixelInput)} disabled={pixelSaving || !pixelInput.trim()}>
              {pixelSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
