import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GuestCheckoutDialog, GuestCheckoutData } from "@/components/checkout/GuestCheckoutDialog";
import { Loader2, Clock, Calendar as CalIcon, ArrowLeft, Video, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { initPixel, trackEventFor } from "@/lib/metaPixel";
import { ProductDetailSkeleton } from '@/components/ui/page-skeletons';
import { formatPrice } from "@/lib/utils";
import { useMercadoPagoCheckout } from "@/hooks/useMercadoPagoCheckout";

interface Props { sessionIdOverride?: string; }

export default function SessionBookingPage({ sessionIdOverride }: Props = {}) {
  const params = useParams();
  const creatorSlug = params.creatorSlug;
  const sessionId = sessionIdOverride || params.sessionId;
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { startCheckout, loading: checkoutLoading, guestDialogOpen, setGuestDialogOpen, submitGuestData } = useMercadoPagoCheckout();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [guestPhone, setGuestPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [freeGuestOpen, setFreeGuestOpen] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);

  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ["public-session", creatorSlug, sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_session", {
        _creator_slug: creatorSlug ?? "", _session_id: sessionId ?? "",
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!creatorSlug && !!sessionId,
  });

  const viewContentFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!creatorSlug || !session || !sessionId || viewContentFiredRef.current === sessionId) return;
    supabase.rpc("get_creator_pixel_id", { _creator_slug: creatorSlug }).then(({ data }) => {
      const pixelId = (data as string | null) ?? null;
      if (!pixelId || viewContentFiredRef.current === sessionId) return;
      viewContentFiredRef.current = sessionId;
      initPixel(pixelId);
      trackEventFor(pixelId, "ViewContent", {
        value: session.price_clp || 0, currency: "CLP", content_type: "product",
        content_category: "session", content_ids: [sessionId], content_name: session.title,
      });
    });
  }, [creatorSlug, sessionId, session]);

  const toDate = useMemo(() => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 14);
    return date.toISOString().slice(0, 10);
  }, [selectedDate]);

  const { data: avail, isLoading: loadingSlots, refetch } = useQuery({
    queryKey: ["availability", sessionId, selectedDate, toDate],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ session_id: sessionId, from_date: selectedDate, to_date: toDate }),
      });
      if (!res.ok) throw new Error("No se pudo cargar la disponibilidad");
      return res.json();
    },
    enabled: !!session,
  });

  const slotsByDate = useMemo(() => {
    const grouped: Record<string, string[]> = {};
    (avail?.slots || []).forEach((iso: string) => {
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: avail?.timezone || session?.timezone || "America/Santiago",
        year: "numeric", month: "2-digit", day: "2-digit",
      }).format(new Date(iso));
      (grouped[key] ||= []).push(iso);
    });
    return grouped;
  }, [avail, session?.timezone]);

  const todaySlots = slotsByDate[selectedDate] || [];
  const isFree = !session?.price_clp;

  const openSchedule = (iso: string) => {
    setSelectedSlot(iso);
    setGuestPhone("");
    setScheduleOpen(true);
  };

  const createFreeBooking = async (guest?: GuestCheckoutData) => {
    if (!selectedSlot || !sessionId) return;
    if (!user && !guest) return;
    setFreeLoading(true);
    try {
      const auth = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(auth.data.session ? { Authorization: `Bearer ${auth.data.session.access_token}` } : {}),
        },
        body: JSON.stringify({
          session_id: sessionId, start_at: selectedSlot,
          guest_name: guest?.name, guest_email: guest?.email, guest_phone: user ? guestPhone.trim() : guest?.phone,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(res.status === 409 ? "Ese horario ya fue tomado" : body.error || "No se pudo reservar");
        refetch();
        return;
      }
      navigate(`/booking/success?id=${body.booking_id}&token=${body.ics_token}`);
    } catch (error: any) {
      toast.error(error?.message || "No se pudo reservar");
    } finally {
      setFreeLoading(false);
    }
  };

  const continueBooking = async () => {
    if (!selectedSlot || !session) return;
    setScheduleOpen(false);
    if (isFree) {
      if (user) {
        if (!guestPhone.trim()) { toast.error("Ingresa tu teléfono de contacto"); setScheduleOpen(true); return; }
        await createFreeBooking();
      } else {
        setFreeGuestOpen(true);
      }
      return;
    }
    await startCheckout("session", session.id, {
      value: session.price_clp,
      contentName: session.title,
      selectedStartAt: selectedSlot,
      customerPhone: user ? guestPhone.trim() : undefined,
    });
  };

  if (loadingSession) return <ProductDetailSkeleton />;
  if (!session) return <div className="p-12 text-center">Servicio no encontrado.</div>;

  const dateLabel = selectedSlot
    ? new Date(selectedSlot).toLocaleString("es-CL", { dateStyle: "full", timeStyle: "short", timeZone: session.timezone })
    : null;

  return (
    <>
      <div className="bg-muted/30 border-b">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/creator/${creatorSlug}`)} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-1" /> Ver perfil
          </Button>
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-5">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Servicio 1:1</Badge>
                <Badge variant="outline"><Clock className="h-3.5 w-3.5 mr-1" />{session.duration_min} min</Badge>
                <Badge variant="outline"><Video className="h-3.5 w-3.5 mr-1" />Agenda online</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight">{session.title}</h1>
              <p className="text-muted-foreground">Con {session.creator_name}</p>
              {session.description ? (
                <div className="prose prose-sm md:prose-base max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(session.description) }} />
              ) : <p className="text-muted-foreground">Sin descripción.</p>}
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="bg-background border rounded-lg p-4"><Clock className="h-5 w-5 text-primary mb-2" /><p className="font-medium">{session.duration_min} minutos</p><p className="text-xs text-muted-foreground">Duración</p></div>
                <div className="bg-background border rounded-lg p-4"><CalIcon className="h-5 w-5 text-primary mb-2" /><p className="font-medium">Fechas disponibles</p><p className="text-xs text-muted-foreground">Elige tu horario</p></div>
                <div className="bg-background border rounded-lg p-4"><CheckCircle2 className="h-5 w-5 text-primary mb-2" /><p className="font-medium">Confirmación</p><p className="text-xs text-muted-foreground">Recibirás los detalles por correo</p></div>
              </div>
            </div>
            <div className="lg:col-span-4">
              <Card className="lg:sticky lg:top-24 overflow-hidden">
                {session.cover_url ? <img src={session.cover_url} alt={session.title} className="w-full aspect-video object-cover" /> : <div className="w-full aspect-video bg-muted flex items-center justify-center"><Video className="h-12 w-12 text-muted-foreground" /></div>}
                <CardHeader><CardTitle className="text-3xl">{isFree ? "Gratis" : formatPrice(session.price_clp)}</CardTitle><CardDescription>{isFree ? "Reserva gratuita" : "Pago único · agenda tu sesión"}</CardDescription></CardHeader>
                <CardContent><Button size="lg" className="w-full" onClick={() => document.getElementById("availability")?.scrollIntoView({ behavior: "smooth" })}><CalIcon className="h-4 w-4 mr-2" />Ver fechas disponibles</Button></CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <main id="availability" className="max-w-4xl mx-auto px-4 py-10">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalIcon className="h-5 w-5" />Elige fecha y hora</CardTitle><CardDescription>Zona horaria: {session.timezone}</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div><Label htmlFor="session-date">Fecha</Label><Input id="session-date" type="date" value={selectedDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null); }} /></div>
            {loadingSlots ? <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Cargando horarios...</div> : todaySlots.length === 0 ? <p className="text-sm text-muted-foreground">Sin horarios disponibles este día.</p> : <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{todaySlots.map((iso) => <Button key={iso} variant="outline" onClick={() => openSchedule(iso)}>{new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: session.timezone })}</Button>)}</div>}
          </CardContent>
        </Card>
      </main>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Confirmar horario</DialogTitle><DialogDescription>Revisa la fecha y continúa para reservar tu sesión.</DialogDescription></DialogHeader>
          <div className="rounded-lg border bg-muted/30 p-4"><p className="font-medium capitalize">{dateLabel}</p><p className="text-sm text-muted-foreground mt-1">{session.duration_min} minutos · {session.timezone}</p></div>
          {user && <div className="space-y-2"><Label htmlFor="booking-phone">Teléfono de contacto</Label><Input id="booking-phone" type="tel" placeholder="+56 9 1234 5678" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} /></div>}
          <Button onClick={continueBooking} disabled={checkoutLoading || freeLoading} className="w-full">{(checkoutLoading || freeLoading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{isFree ? "Confirmar reserva" : `Continuar al pago · ${formatPrice(session.price_clp)}`}</Button>
        </DialogContent>
      </Dialog>

      <GuestCheckoutDialog open={guestDialogOpen} onOpenChange={setGuestDialogOpen} onSubmit={submitGuestData} loading={checkoutLoading} />
      <GuestCheckoutDialog open={freeGuestOpen} onOpenChange={setFreeGuestOpen} onSubmit={createFreeBooking} loading={freeLoading} />
    </>
  );
}
