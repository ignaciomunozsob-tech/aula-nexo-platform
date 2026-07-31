import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SEO } from '@/components/SEO';
import { ProductDetailSkeleton } from '@/components/ui/page-skeletons';
import { detectLink, googleCalendarUrl } from '@/lib/links';
import { sanitizeHtml } from '@/lib/sanitize';
import { ArrowLeft, CalendarDays, Clock, MapPin, Video, CalendarPlus, Loader2, PlayCircle } from 'lucide-react';

type EventDetails = {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  event_type: string;
  event_date: string;
  duration_minutes: number | null;
  location: string | null;
  meeting_url: string | null;
  redirect_url: string | null;
  creator_id: string;
  creator_name: string | null;
  creator_slug: string | null;
  recording_video_id: string | null;
  recording_status: string | null;
};

export default function StudentEventPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase.rpc('get_my_event_details', { _event_id: id });
      if (!active) return;
      if (error) setError('No pudimos cargar este evento.');
      else if (!data || (data as EventDetails[]).length === 0) setError('No tienes acceso a este evento.');
      else setEvent((data as EventDetails[])[0]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const recordingId = event?.recording_video_id ?? null;
  const rawStatus = event?.recording_status ?? 'ready';
  const needsStatusPoll = !!recordingId && ['uploading', 'processing'].includes(rawStatus);

  // Bunny finishes encoding asynchronously; refresh the status so the player
  // appears without the student having to reload the page.
  const { data: liveStatus } = useQuery({
    queryKey: ['event-recording-status', id, recordingId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('event-recording-video', {
        body: { action: 'status', eventId: id },
      });
      if (error) throw error;
      return (data ?? {}) as { status?: string };
    },
    enabled: needsStatusPoll,
    refetchInterval: 15000,
  });

  const status = liveStatus?.status ?? rawStatus;
  const recordingReady = !!recordingId && status === 'ready';
  const recordingProcessing = !!recordingId && ['uploading', 'processing'].includes(status);

  const { data: recordingEmbed } = useQuery({
    queryKey: ['event-recording-embed', recordingId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('bunny-sign-embed', {
        body: { videoId: recordingId },
      });
      if (error) throw error;
      return (data ?? {}) as { url?: string };
    },
    enabled: recordingReady,
    staleTime: 50 * 60 * 1000,
    refetchInterval: 55 * 60 * 1000,
  });


  if (loading) {
    return (
      <div className="p-8">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="text-xl font-semibold mb-2">Evento no disponible</h1>
        <p className="text-muted-foreground mb-6">{error ?? 'No encontramos este evento.'}</p>
        <Button asChild variant="outline">
          <Link to="/app/my-courses">Volver a mis productos</Link>
        </Button>
      </div>
    );
  }

  const start = new Date(event.event_date);
  const end = new Date(start.getTime() + (event.duration_minutes ?? 60) * 60000);
  const now = Date.now();
  const isLive = now >= start.getTime() && now <= end.getTime();
  const isPast = now > end.getTime();
  const isOnline = event.event_type === 'online';
  const redirect = event.redirect_url ? detectLink(event.redirect_url) : null;
  const RedirectIcon = redirect?.icon;

  const dateLabel = start.toLocaleString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Santiago',
  });

  return (
    <div className="p-8 max-w-4xl">
      <SEO title={`${event.title} — NOVU`} description="Detalles de tu evento en NOVU." noindex />

      <Link
        to="/app/my-courses"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Mis productos
      </Link>

      <div className="rounded-xl overflow-hidden border border-border bg-card">
        <div className="aspect-[21/9] bg-muted relative">
          {event.cover_image_url ? (
            <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <CalendarDays className="h-14 w-14 text-primary/30" />
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge variant="secondary">Evento</Badge>
            <Badge variant="secondary">{isOnline ? 'Online' : 'Presencial'}</Badge>
            {isLive && <Badge className="bg-success text-success-foreground">En curso</Badge>}
            {isPast && <Badge variant="outline">Finalizado</Badge>}
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">{event.title}</h1>
            {event.creator_name && (
              <p className="text-sm text-muted-foreground mt-1">Por {event.creator_name}</p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 rounded-lg border border-border p-4">
              <CalendarDays className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Fecha y hora (Chile)</p>
                <p className="font-medium capitalize">{dateLabel}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border p-4">
              <Clock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Duración</p>
                <p className="font-medium">{event.duration_minutes ? `${event.duration_minutes} minutos` : 'Por confirmar'}</p>
              </div>
            </div>
          </div>

          {!isOnline && event.location && (
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Dirección</p>
                  <p className="font-medium">{event.location}</p>
                  <Button asChild variant="outline" size="sm" className="mt-3">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver en Google Maps
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isOnline && event.meeting_url && (
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-start gap-3">
                <Video className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Enlace de acceso</p>
                  <p className="font-medium break-all">{event.meeting_url}</p>
                  <Button asChild size="sm" className="mt-3">
                    <a href={event.meeting_url} target="_blank" rel="noopener noreferrer">
                      Entrar al evento
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isOnline && (recordingReady || recordingProcessing) && (
            <div className="space-y-3">
              <h2 className="font-semibold flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-primary" />
                Grabación del evento
              </h2>
              <div className="bg-black overflow-hidden rounded-lg" style={{ aspectRatio: '16 / 9' }}>
                {recordingProcessing ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/80 text-sm">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    La grabación se está procesando…
                  </div>
                ) : recordingEmbed?.url ? (
                  <iframe
                    src={`${recordingEmbed.url}&autoplay=false&preload=true&responsive=true`}
                     referrerPolicy="strict-origin-when-cross-origin"
                    className="w-full h-full"
                    style={{ border: 'none' }}
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    title={`Grabación de ${event.title}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/70 text-sm animate-pulse">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Cargando grabación…
                  </div>
                )}
              </div>
            </div>
          )}



          {redirect && RedirectIcon && event.redirect_url && (
            <Button asChild className="w-full sm:w-auto gap-2">
              <a href={event.redirect_url} target="_blank" rel="noopener noreferrer">
                <RedirectIcon className="h-4 w-4" />
                {redirect.label}
              </a>
            </Button>
          )}

          {event.description && (
            <div>
              <h2 className="font-semibold mb-2">Sobre el evento</h2>
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description) }}
              />
            </div>
          )}

          <div className="pt-2">
            <Button asChild variant="outline" className="gap-2">
              <a
                href={googleCalendarUrl({
                  title: event.title,
                  start,
                  end,
                  details: event.description,
                  location: isOnline ? event.meeting_url : event.location,
                })}
                target="_blank"
                rel="noopener noreferrer"
              >
                <CalendarPlus className="h-4 w-4" />
                Agregar al calendario
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
