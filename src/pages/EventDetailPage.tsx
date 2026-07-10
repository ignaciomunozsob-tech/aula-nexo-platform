import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, Users, Clock } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatPrice } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";
import { useMercadoPagoCheckout } from "@/hooks/useMercadoPagoCheckout";
import { useAuth } from "@/lib/auth";

interface Props {
  eventId?: string;
}

export default function EventDetailPage({ eventId: eventIdProp }: Props) {
  const params = useParams();
  const { user } = useAuth();
  const { startCheckout, loading: checkoutLoading } = useMercadoPagoCheckout();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event-public", eventIdProp, params.slug, params.creatorSlug],
    queryFn: async () => {
      let q = supabase
        .from("events")
        .select("id, title, description, cover_image_url, price_clp, event_date, duration_minutes, max_attendees, event_type, slug, creator_id, status")
        .eq("status", "published");
      if (eventIdProp) q = q.eq("id", eventIdProp);
      else if (params.slug) q = q.eq("slug", params.slug);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: creators, error: creatorError } = await supabase.rpc("get_public_creators_by_ids", {
        _ids: [data.creator_id],
      });
      if (creatorError) throw creatorError;

      const creator = Array.isArray(creators) ? creators[0] : null;
      if (params.creatorSlug && creator?.creator_slug && creator.creator_slug !== params.creatorSlug) {
        return null;
      }

      return { ...data, creator };
    },
    enabled: !!eventIdProp || !!params.slug,
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!event) {
    return <div className="max-w-3xl mx-auto p-12 text-center"><p className="text-muted-foreground">Evento no encontrado.</p></div>;
  }

  const creator = (event as any).creator;
  const eventUrl = creator?.creator_slug && event.slug ? `/${creator.creator_slug}/${event.slug}` : `/`;

  const handleBuy = async () => {
    await startCheckout("event", event.id, {
      contentName: event.title,
      value: event.price_clp || 0,
    });
  };

  return (
    <>
      <SEO
        title={`${event.title} — ${creator?.name || "NOVU"}`}
        description={event.description?.replace(/<[^>]+>/g, "").slice(0, 160) || `Evento de ${creator?.name}`}
        path={eventUrl}
      />
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            {event.cover_image_url ? (
              <img src={event.cover_image_url} alt={event.title} className="rounded-xl w-full aspect-video object-cover" />
            ) : (
              <div className="rounded-xl bg-muted aspect-video" />
            )}
          </div>
          <div className="space-y-4">
            <Badge variant="secondary">{event.event_type === "live" ? "En vivo" : "Presencial"}</Badge>
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <p className="text-sm text-muted-foreground">por {creator?.name}</p>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {event.event_date && (
                <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />
                  {new Date(event.event_date).toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" })}
                </span>
              )}
              {event.duration_minutes && (
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {event.duration_minutes} min</span>
              )}
              {event.max_attendees && (
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> Cupos: {event.max_attendees}</span>
              )}
            </div>
            <Card>
              <CardContent className="p-6 space-y-3">
                <p className="text-3xl font-bold">{event.price_clp ? formatPrice(event.price_clp) : "Gratis"}</p>
                <Button className="w-full" onClick={handleBuy} disabled={checkoutLoading}>
                  {checkoutLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Inscribirme
                </Button>
                {!user && <p className="text-xs text-muted-foreground text-center">Te pediremos tu correo en el siguiente paso.</p>}
              </CardContent>
            </Card>
          </div>
        </div>

        {event.description && (
          <Card>
            <CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description) }} />
          </Card>
        )}
      </div>
    </>
  );
}
