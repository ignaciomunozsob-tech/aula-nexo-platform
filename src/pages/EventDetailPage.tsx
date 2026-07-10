import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Calendar, Users, Clock, MapPin, User } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatPrice } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";
import { useMercadoPagoCheckout } from "@/hooks/useMercadoPagoCheckout";
import { useAuth } from "@/lib/auth";
import { GuestCheckoutDialog } from "@/components/checkout/GuestCheckoutDialog";

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
        .select("id, title, description, cover_image_url, price_clp, event_date, duration_minutes, max_attendees, event_type, location, slug, creator_id, status")
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
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        {/* Hero cover — foto horizontal con protagonismo */}
        <div className="relative overflow-hidden rounded-2xl bg-muted">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="w-full aspect-[21/9] object-cover"
            />
          ) : (
            <div className="w-full aspect-[21/9]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-10 space-y-3 text-white">
            <Badge variant="secondary" className="bg-white/90 text-black hover:bg-white">
              {event.event_type === "in_person" ? "Presencial" : "Online"}
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight max-w-3xl">{event.title}</h1>
            {creator?.creator_slug ? (
              <Link
                to={`/creator/${creator.creator_slug}`}
                className="inline-flex items-center gap-2 text-sm md:text-base text-white/90 hover:text-white underline-offset-4 hover:underline"
              >
                <User className="h-4 w-4" />
                por {creator?.name}
              </Link>
            ) : (
              <p className="text-sm md:text-base text-white/80">por {creator?.name}</p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
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
              {event.event_type === "in_person" && (event as any).location && (
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {(event as any).location}</span>
              )}
            </div>

            {creator?.creator_slug && (
              <Link
                to={`/creator/${creator.creator_slug}`}
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <User className="h-4 w-4" />
                Ver perfil de {creator?.name}
              </Link>
            )}

            {event.description && (
              <Card>
                <CardContent
                  className="p-6 prose prose-sm md:prose-base max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description) }}
                />
              </Card>
            )}
          </div>

          <div className="md:col-span-1">
            <Card className="md:sticky md:top-6">
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
      </div>
    </>
  );
}
