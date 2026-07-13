import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Clock, Calendar as CalIcon, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { initPixel, trackEventFor } from "@/lib/metaPixel";

interface Props {
  sessionIdOverride?: string;
}

export default function SessionBookingPage({ sessionIdOverride }: Props = {}) {
  const params = useParams();
  const creatorSlug = params.creatorSlug;
  const sessionId = sessionIdOverride || params.sessionId;
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ["public-session", creatorSlug, sessionId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_session", {
        _creator_slug: creatorSlug!, _session_id: sessionId!,
      });
      if (error) throw error;
      return Array.isArray(data) ? data[0] : data;
    },
    enabled: !!creatorSlug && !!sessionId,
  });

  // Meta Pixel: creator-level ViewContent for the 1:1 session
  useEffect(() => {
    if (!creatorSlug || !session) return;
    supabase.rpc("get_creator_pixel_id", { _creator_slug: creatorSlug }).then(({ data }) => {
      const pid = (data as string | null) ?? null;
      if (!pid) return;
      initPixel(pid);
      trackEventFor(pid, "ViewContent", {
        value: (session as any).price_clp || 0,
        currency: "CLP",
        content_type: "session",
        content_ids: [sessionId],
        content_name: (session as any).title,
      });
    });
  }, [creatorSlug, sessionId, session]);

  // Range: from selected date to +14 days (cap)
  const fromDate = selectedDate;
  const toDate = useMemo(() => {
    const d = new Date(selectedDate); d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  }, [selectedDate]);

  const { data: avail, isLoading: loadingSlots, refetch } = useQuery({
    queryKey: ["availability", sessionId, fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ session_id: sessionId, from_date: fromDate, to_date: toDate }),
      });
      if (!res.ok) throw new Error("availability_failed");
      return res.json();
    },
    enabled: !!session,
  });

  const slotsByDate = useMemo(() => {
    const m: Record<string, string[]> = {};
    (avail?.slots || []).forEach((iso: string) => {
      const d = new Date(iso);
      const key = new Intl.DateTimeFormat("en-CA", {
        timeZone: avail?.timezone || "America/Santiago",
        year: "numeric", month: "2-digit", day: "2-digit",
      }).format(d);
      (m[key] ||= []).push(iso);
    });
    return m;
  }, [avail]);

  const todaySlots = slotsByDate[selectedDate] || [];

  const submit = async () => {
    if (!selectedSlot) return;
    if (!user && (!guestName.trim() || !guestEmail.trim())) {
      toast.error("Ingresa tu nombre y email"); return;
    }
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(sess.session ? { Authorization: `Bearer ${sess.session.access_token}` } : {}),
        },
        body: JSON.stringify({
          session_id: sessionId,
          start_at: selectedSlot,
          guest_name: user ? undefined : guestName.trim(),
          guest_email: user ? undefined : guestEmail.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (res.status === 409) toast.error("Ese horario ya fue tomado", { description: "Elige otro" });
        else toast.error("No se pudo reservar", { description: body.error });
        refetch();
        setSubmitting(false);
        return;
      }
      navigate(`/booking/success?id=${body.booking_id}&token=${body.ics_token}`);
    } catch (e: any) {
      toast.error(e.message);
      setSubmitting(false);
    }
  };

  if (loadingSession) return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  if (!session) return <div className="p-12 text-center">Sesión no encontrada.</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/creator/${creatorSlug}`)}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Ver perfil
      </Button>

      <Card>
        <CardHeader>
          <CardDescription>Servicio con {session.creator_name}</CardDescription>
          <CardTitle className="text-2xl">{session.title}</CardTitle>
          <div className="flex items-center gap-3 text-sm text-muted-foreground pt-2">
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {session.duration_min} min</span>
            <span>Gratis</span>
          </div>
        </CardHeader>
        {session.description && (
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(session.description) }} />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><CalIcon className="h-5 w-5" /> Elige fecha y hora</CardTitle>
          <CardDescription>Zona horaria: {session.timezone}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Fecha</Label>
            <Input type="date" value={selectedDate}
              min={new Date().toISOString().slice(0,10)}
              onChange={(e) => { setSelectedDate(e.target.value); setSelectedSlot(null); }} />
          </div>
          {loadingSlots ? <Loader2 className="animate-spin" /> : todaySlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin horarios disponibles este día.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {todaySlots.map((iso) => {
                const t = new Date(iso).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", timeZone: session.timezone });
                return (
                  <Button key={iso} variant={selectedSlot === iso ? "default" : "outline"} size="sm"
                    onClick={() => setSelectedSlot(iso)}>{t}</Button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSlot && (
        <Card>
          <CardHeader><CardTitle>Confirmar reserva</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              <strong>{new Date(selectedSlot).toLocaleString("es-CL", { dateStyle: "full", timeStyle: "short", timeZone: session.timezone })}</strong>
            </p>
            {!user && (
              <>
                <div>
                  <Label>Tu nombre</Label>
                  <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                </div>
                <div>
                  <Label>Tu email</Label>
                  <Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
                </div>
              </>
            )}
            {user && profile && (
              <p className="text-sm text-muted-foreground">Reservando como <strong>{profile.name || user.email}</strong></p>
            )}
            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar reserva
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
