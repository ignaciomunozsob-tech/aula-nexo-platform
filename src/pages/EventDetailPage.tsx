import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Users, Clock, MapPin, Video } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatPrice } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";
import { useMercadoPagoCheckout } from "@/hooks/useMercadoPagoCheckout";
import { useAuth } from "@/lib/auth";
import { GuestCheckoutDialog } from "@/components/checkout/GuestCheckoutDialog";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  eventId?: string;
}

export default function EventDetailPage({ eventId: eventIdProp }: Props) {
  const params = useParams();
  const { user } = useAuth();
  const { startCheckout, loading: checkoutLoading, guestDialogOpen, setGuestDialogOpen, submitGuestEmail } = useMercadoPagoCheckout();

  const [freeGuestOpen, setFreeGuestOpen] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);

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
  const isOnline = event.event_type !== "in_person";
  const isFree = !event.price_clp || event.price_clp <= 0;

  const registerFree = async (guest?: { name: string; email: string; phone: string }) => {
    setFreeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-free-event", {
        body: {
          event_id: event.id,
          guest_email: guest?.email,
          guest_name: guest?.name,
          guest_phone: guest?.phone,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("¡Inscripción confirmada! Te enviamos un correo con los detalles.");
      const redirect = (data as any)?.redirect_url as string | null | undefined;
      if (redirect) {
        if (window.top && window.top !== window.self) window.top.location.href = redirect;
        else window.location.href = redirect;
      }
    } catch (e: any) {
      console.error(e);
      toast.error("No se pudo inscribir: " + (e?.message ?? "error desconocido"));
    } finally {
      setFreeLoading(false);
      setFreeGuestOpen(false);
    }
  };

  const handleBuy = async () => {
    if (isFree) {
      if (user) {
        await registerFree();
      } else {
        setFreeGuestOpen(true);
      }
      return;
    }
    await startCheckout("event", event.id, {
      contentName: event.title,
      value: event.price_clp || 0,
    });
  };

  const busy = checkoutLoading || freeLoading;

  const eventDate = event.event_date ? new Date(event.event_date) : null;
  const dateLabel = eventDate?.toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeLabel = eventDate?.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });


  return (
    <>
      <SEO
        title={`${event.title} — ${creator?.name || "NOVU"}`}
        description={event.description?.replace(/<[^>]+>/g, "").slice(0, 160) || `Evento de ${creator?.name}`}
        path={eventUrl}
      />

      {/* HERO */}
      <section className="bg-muted/30 border-b">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
          {/* Portada horizontal protagonista */}
          <div className="overflow-hidden rounded-2xl bg-muted mb-8">
            {event.cover_image_url ? (
              <img
                src={event.cover_image_url}
                alt={event.title}
                className="w-full aspect-[21/9] object-cover"
              />
            ) : (
              <div className="w-full aspect-[21/9]" />
            )}
          </div>

          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* LEFT */}
            <div className="lg:col-span-8 space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {isOnline ? "Online" : "Presencial"}
                </Badge>
                {event.duration_minutes && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {event.duration_minutes} min
                  </Badge>
                )}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold leading-tight">{event.title}</h1>

              {creator && (
                <div className="text-sm text-muted-foreground">
                  Creado por{" "}
                  {creator.creator_slug ? (
                    <Link to={`/creator/${creator.creator_slug}`} className="text-primary hover:underline font-medium">
                      {creator.name}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium">{creator.name}</span>
                  )}
                </div>
              )}

              {/* Precio + CTA (mobile) */}
              <div className="lg:hidden bg-background border rounded-xl p-5 shadow-sm space-y-3">
                <div className="text-3xl font-bold">
                  {event.price_clp ? formatPrice(event.price_clp) : <span className="text-green-600">Gratis</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {event.price_clp ? "Pago único · acceso al evento" : "Inscripción gratuita"}
                </p>
                <Button size="lg" className="w-full" onClick={handleBuy} disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Inscribirme
                </Button>
                {!user && (
                  <p className="text-xs text-muted-foreground text-center">
                    Te pediremos tu correo en el siguiente paso.
                  </p>
                )}
              </div>



              {/* Bloques prominentes: fecha, hora, duración */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-background border rounded-lg px-4 py-4">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Calendar className="h-5 w-5" />
                    <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Fecha</p>
                  </div>
                  <p className="text-base font-semibold capitalize">
                    {dateLabel || "Por definir"}
                  </p>
                </div>
                <div className="bg-background border rounded-lg px-4 py-4">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Clock className="h-5 w-5" />
                    <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Hora</p>
                  </div>
                  <p className="text-base font-semibold">
                    {timeLabel ? `${timeLabel} hrs` : "Por definir"}
                  </p>
                </div>
                <div className="bg-background border rounded-lg px-4 py-4">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Clock className="h-5 w-5" />
                    <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Duración</p>
                  </div>
                  <p className="text-base font-semibold">
                    {event.duration_minutes ? `${event.duration_minutes} minutos` : "Por definir"}
                  </p>
                </div>
              </div>

              {/* Formato / ubicación */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {isOnline ? (
                      <Video className="h-5 w-5 text-primary" />
                    ) : (
                      <MapPin className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      {isOnline ? "Evento online" : "Evento presencial"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isOnline
                        ? "Recibirás el link de acceso al inscribirte"
                        : (event as any).location || "Ubicación por confirmar"}
                    </p>
                  </div>
                </div>
              </div>

              {event.max_attendees && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Cupos limitados: {event.max_attendees} personas</span>
                </div>
              )}

              {/* Descripción */}
              <div className="pt-4">
                <h2 className="text-xl font-semibold mb-3">Sobre este evento</h2>
                {event.description ? (
                  <div
                    className="prose prose-sm md:prose-base max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(event.description) }}
                  />
                ) : (
                  <p className="text-muted-foreground">Sin descripción.</p>
                )}
              </div>
            </div>

            {/* RIGHT - Sticky sidebar con precio */}
            <div className="hidden lg:block lg:col-span-4">
              <div className="bg-background border rounded-xl p-5 shadow-sm lg:sticky lg:top-24 space-y-3">
                <div className="text-3xl font-bold">
                  {event.price_clp ? formatPrice(event.price_clp) : <span className="text-green-600">Gratis</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {event.price_clp ? "Pago único · acceso al evento" : "Inscripción gratuita"}
                </p>
                <Button size="lg" className="w-full" onClick={handleBuy} disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Inscribirme
                </Button>
                {!user && (
                  <p className="text-xs text-muted-foreground text-center">
                    Te pediremos tu correo en el siguiente paso.
                  </p>
                )}

                <div className="pt-3 border-t space-y-2 text-sm">
                  {dateLabel && (
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <span className="capitalize">{dateLabel}{timeLabel ? ` · ${timeLabel} hrs` : ""}</span>
                    </div>
                  )}
                  {event.duration_minutes && (
                    <div className="flex items-start gap-2">
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <span>{event.duration_minutes} min de duración</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    {isOnline ? <Video className="h-4 w-4 mt-0.5 text-muted-foreground" /> : <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />}
                    <span>{isOnline ? "Online" : (event as any).location || "Presencial"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <GuestCheckoutDialog
        open={guestDialogOpen}
        onOpenChange={setGuestDialogOpen}
        onSubmit={submitGuestEmail}
        loading={checkoutLoading}
      />

      <GuestCheckoutDialog
        open={freeGuestOpen}
        onOpenChange={setFreeGuestOpen}
        onSubmit={(email) => registerFree(email)}
        loading={freeLoading}
      />
    </>
  );
}
