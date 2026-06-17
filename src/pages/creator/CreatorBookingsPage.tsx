import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Video, X, Loader2, CalendarDays, List, Clock } from "lucide-react";
import { toast } from "sonner";
import { Calendar, dateFnsLocalizer, Views, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addDays } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/styles/calendar.css";
import CreatorAvailabilityPage from "./CreatorAvailabilityPage";

const locales = { es };
const localizer = dateFnsLocalizer({
  format, parse, startOfWeek: () => startOfWeek(new Date(), { locale: es }), getDay, locales,
});

interface CalEvent {
  id: string; title: string; start: Date; end: Date;
  resource: { kind: "novu" | "google"; raw: any };
}

export default function CreatorBookingsPage() {
  const qc = useQueryClient();
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState<Date>(new Date());
  const [selected, setSelected] = useState<CalEvent | null>(null);

  const range = useMemo(() => {
    const s = startOfMonth(date); const e = endOfMonth(date);
    return { from: addDays(s, -7).toISOString(), to: addDays(e, 7).toISOString() };
  }, [date]);

  const { data: calData, isLoading: loadingCal } = useQuery({
    queryKey: ["creator-calendar", range.from, range.to],
    queryFn: async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return { novu_bookings: [], google_events: [] };
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/creator-calendar-events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${sess.session.access_token}`,
        },
        body: JSON.stringify(range),
      });
      if (!res.ok) throw new Error("calendar_failed");
      return res.json();
    },
  });

  const { data: listData, isLoading: loadingList } = useQuery({
    queryKey: ["creator-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_creator_session_bookings");
      if (error) throw error;
      return data || [];
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { data: sess } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/booking-cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${sess.session?.access_token}` },
        body: JSON.stringify({ booking_id: id }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "cancel_failed");
    },
    onSuccess: () => {
      toast.success("Reserva cancelada");
      qc.invalidateQueries({ queryKey: ["creator-bookings"] });
      qc.invalidateQueries({ queryKey: ["creator-calendar"] });
      setSelected(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const events: CalEvent[] = useMemo(() => {
    const out: CalEvent[] = [];
    (calData?.novu_bookings || []).forEach((b: any) => {
      if (b.status !== "confirmed") return;
      out.push({
        id: `novu-${b.id}`,
        title: `${b.one_on_one_sessions?.title || "Servicio"} · ${b.guest_name || b.guest_email || ""}`,
        start: new Date(b.start_at),
        end: new Date(b.end_at),
        resource: { kind: "novu", raw: b },
      });
    });
    (calData?.google_events || []).forEach((e: any) => {
      out.push({
        id: `g-${e.id}`,
        title: `📅 ${e.title}`,
        start: new Date(e.start),
        end: new Date(e.end),
        resource: { kind: "google", raw: e },
      });
    });
    return out;
  }, [calData]);

  const now = Date.now();
  const upcoming = (listData || []).filter((b: any) => new Date(b.start_at).getTime() >= now && b.status === "confirmed");
  const past = (listData || []).filter((b: any) => new Date(b.start_at).getTime() < now || b.status === "cancelled");

  const Row = ({ b }: { b: any }) => (
    <div className="flex items-center justify-between gap-3 py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{b.session_title}</p>
        <p className="text-sm text-muted-foreground">
          {new Date(b.start_at).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" })}
          {" · "}{b.attendee_name || b.attendee_email}
          {b.status === "cancelled" && <span className="text-destructive"> · Cancelada</span>}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {b.meet_url && b.status === "confirmed" && (
          <Button asChild size="sm" variant="outline">
            <a href={b.meet_url} target="_blank" rel="noreferrer"><Video className="h-4 w-4 mr-1" /> Meet</a>
          </Button>
        )}
        {b.status === "confirmed" && new Date(b.start_at).getTime() >= now && (
          <Button size="sm" variant="ghost" onClick={() => confirm("¿Cancelar reserva?") && cancel.mutate(b.id)}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Reservas</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tus servicios agendados y eventos de Google Calendar.
        </p>
      </div>

      <Tabs defaultValue="calendar">
        <div className="-mx-4 sm:mx-0 overflow-x-auto px-4 sm:px-0">
          <TabsList className="w-max sm:w-auto">
            <TabsTrigger value="calendar"><CalendarDays className="h-4 w-4 mr-1" /> Calendario</TabsTrigger>
            <TabsTrigger value="list"><List className="h-4 w-4 mr-1" /> Lista</TabsTrigger>
            <TabsTrigger value="availability"><Clock className="h-4 w-4 mr-1" /> Disponibilidad</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardContent className="p-2 sm:p-4">
              {loadingCal && <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto" /></div>}
              <div className="h-[500px] sm:h-[650px]">
                <Calendar
                  localizer={localizer}
                  events={events}
                  view={view}
                  onView={setView}
                  date={date}
                  onNavigate={setDate}
                  views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
                  culture="es"
                  popup
                  onSelectEvent={(e) => setSelected(e as CalEvent)}
                  eventPropGetter={(event: any) => {
                    const isNovu = event.resource.kind === "novu";
                    return {
                      style: isNovu ? {
                        backgroundColor: "hsl(var(--primary))",
                        color: "hsl(var(--primary-foreground))",
                        borderLeft: "3px solid hsl(var(--primary))",
                        fontWeight: 600,
                      } : {
                        backgroundColor: "hsl(var(--muted))",
                        color: "hsl(var(--muted-foreground))",
                        borderLeft: "3px solid hsl(var(--muted-foreground) / 0.6)",
                        fontWeight: 500,
                      },
                    };
                  }}
                  messages={{
                    today: "Hoy", previous: "Atrás", next: "Siguiente",
                    month: "Mes", week: "Semana", day: "Día", agenda: "Agenda",
                    date: "Fecha", time: "Hora", event: "Evento", noEventsInRange: "Sin eventos en este rango",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-4 space-y-4">
          {loadingList ? <Loader2 className="animate-spin" /> : (
            <>
              <Card>
                <CardHeader><CardTitle>Próximas ({upcoming.length})</CardTitle></CardHeader>
                <CardContent>
                  {upcoming.length === 0 ? <p className="text-sm text-muted-foreground">Sin reservas próximas.</p> :
                    upcoming.map((b: any) => <Row key={b.id} b={b} />)}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Historial</CardTitle></CardHeader>
                <CardContent>
                  {past.length === 0 ? <p className="text-sm text-muted-foreground">Sin historial.</p> :
                    past.slice(0, 50).map((b: any) => <Row key={b.id} b={b} />)}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          <div className="-m-6">
            <CreatorAvailabilityPage />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          {selected && selected.resource.kind === "novu" ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.resource.raw.one_on_one_sessions?.title || "Reserva"}</DialogTitle>
                <DialogDescription>
                  {selected.start.toLocaleString("es-CL", { dateStyle: "full", timeStyle: "short" })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <p><strong>Asistente:</strong> {selected.resource.raw.guest_name || "—"}</p>
                <p><strong>Email:</strong> {selected.resource.raw.guest_email || "—"}</p>
                {selected.resource.raw.meet_url && (
                  <Button asChild size="sm" variant="outline" className="w-full">
                    <a href={selected.resource.raw.meet_url} target="_blank" rel="noreferrer">
                      <Video className="h-4 w-4 mr-1" /> Abrir Google Meet
                    </a>
                  </Button>
                )}
                <Button variant="destructive" size="sm" className="w-full"
                  onClick={() => confirm("¿Cancelar reserva?") && cancel.mutate(selected.resource.raw.id)}>
                  <X className="h-4 w-4 mr-1" /> Cancelar reserva
                </Button>
              </div>
            </>
          ) : selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.resource.raw.title}</DialogTitle>
                <DialogDescription>
                  Evento de Google Calendar · {selected.start.toLocaleString("es-CL", { dateStyle: "full", timeStyle: "short" })}
                </DialogDescription>
              </DialogHeader>
              {selected.resource.raw.html_link && (
                <Button asChild size="sm" variant="outline">
                  <a href={selected.resource.raw.html_link} target="_blank" rel="noreferrer">Abrir en Google Calendar</a>
                </Button>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
