import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Video, Calendar, Download } from "lucide-react";
import { googleCalendarUrl, icsDownloadUrl } from "@/lib/calendar-links";

export default function SessionBookingSuccessPage() {
  const [params] = useSearchParams();
  const id = params.get("id");
  const token = params.get("token");
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data } = await supabase
        .from("session_bookings")
        .select("id, start_at, end_at, meet_url, ics_token, session_id")
        .eq("id", id)
        .maybeSingle();
      if (!data) return;
      const { data: s } = await supabase
        .from("one_on_one_sessions")
        .select("title, description")
        .eq("id", data.session_id)
        .maybeSingle();
      setBooking({ ...data, session: s });
    })();
  }, [id]);

  if (!booking) return <div className="p-12 text-center">Cargando…</div>;

  const start = new Date(booking.start_at);
  const end = new Date(booking.end_at);
  const gcal = googleCalendarUrl({
    title: booking.session?.title || "Sesión 1:1",
    description: booking.meet_url ? `Link: ${booking.meet_url}` : "",
    location: booking.meet_url || "",
    start, end,
  });
  const ics = icsDownloadUrl(booking.id, token || booking.ics_token);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center py-8">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-3" />
        <h1 className="text-2xl font-bold">¡Reserva confirmada!</h1>
        <p className="text-muted-foreground mt-1">Te enviamos los detalles a tu calendario.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{booking.session?.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            <strong>{start.toLocaleString("es-CL", { dateStyle: "full", timeStyle: "short" })}</strong>
          </p>
          {booking.meet_url && (
            <Button asChild className="w-full">
              <a href={booking.meet_url} target="_blank" rel="noreferrer">
                <Video className="h-4 w-4 mr-2" /> Unirme a Google Meet
              </a>
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button asChild variant="outline">
              <a href={gcal} target="_blank" rel="noreferrer">
                <Calendar className="h-4 w-4 mr-2" /> Google Calendar
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={ics}>
                <Download className="h-4 w-4 mr-2" /> Descargar .ics
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button asChild variant="ghost"><Link to="/">Volver al inicio</Link></Button>
      </div>
    </div>
  );
}
