import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, BookOpen, User } from "lucide-react";
import { SEO } from "@/components/SEO";
import { formatPrice } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize";
import { useMercadoPagoCheckout } from "@/hooks/useMercadoPagoCheckout";
import { GuestCheckoutDialog } from "@/components/checkout/GuestCheckoutDialog";
import { initPixel, trackEventFor } from "@/lib/metaPixel";

interface Props {
  ebookId?: string;
}

export default function EbookDetailPage({ ebookId: ebookIdProp }: Props) {
  const params = useParams();
  const { startCheckout, loading: checkoutLoading, guestDialogOpen, setGuestDialogOpen, submitGuestData } = useMercadoPagoCheckout();

  const { data: ebook, isLoading } = useQuery({
    queryKey: ["ebook-public", ebookIdProp, params.slug, params.creatorSlug],
    queryFn: async () => {
      let q = supabase
        .from("ebooks")
        .select("id, title, description, cover_image_url, price_clp, slug, creator_id, status, profiles:creator_id(name, avatar_url, creator_slug)")
        .eq("status", "published");
      if (ebookIdProp) q = q.eq("id", ebookIdProp);
      else if (params.slug) q = q.eq("slug", params.slug);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!ebookIdProp || !!params.slug,
  });

  // Meta Pixel: creator-level ViewContent
  useEffect(() => {
    const cid = (ebook as any)?.creator_id;
    if (!cid || !ebook) return;
    supabase.rpc("get_creator_pixel_id_by_id", { _creator_id: cid }).then(({ data }) => {
      const pid = (data as string | null) ?? null;
      if (!pid) return;
      initPixel(pid);
      trackEventFor(pid, "ViewContent", {
        value: ebook.price_clp || 0,
        currency: "CLP",
        content_type: "ebook",
        content_ids: [ebook.id],
        content_name: ebook.title,
      });
    });
  }, [ebook]);

  const _pixelHookInstalled = true;
  void _pixelHookInstalled;

  if (isLoading) return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  // (placeholder replaced below)

  if (isLoading) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!ebook) {
    return <div className="max-w-3xl mx-auto p-12 text-center"><p className="text-muted-foreground">Ebook no encontrado.</p></div>;
  }

  const creator = (ebook as any).profiles;
  const url = creator?.creator_slug && ebook.slug ? `/${creator.creator_slug}/${ebook.slug}` : `/`;

  const handleBuy = async () => {
    await startCheckout("ebook", ebook.id, {
      contentName: ebook.title,
      value: ebook.price_clp || 0,
    });
  };

  return (
    <>
      <SEO
        title={`${ebook.title} — ${creator?.name || "NOVU"}`}
        description={ebook.description?.replace(/<[^>]+>/g, "").slice(0, 160) || `Ebook de ${creator?.name}`}
        path={url}
      />
      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            {ebook.cover_image_url ? (
              <img src={ebook.cover_image_url} alt={ebook.title} className="rounded-xl w-full aspect-[3/4] object-cover" />
            ) : (
              <div className="rounded-xl bg-muted aspect-[3/4] flex items-center justify-center">
                <BookOpen className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="space-y-4">
            <Badge variant="secondary">Ebook</Badge>
            <h1 className="text-3xl font-bold">{ebook.title}</h1>
            {creator?.creator_slug ? (
              <Link
                to={`/creator/${creator.creator_slug}`}
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <User className="h-4 w-4" />
                por {creator?.name}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">por {creator?.name}</p>
            )}
            <Card>
              <CardContent className="p-6 space-y-3">
                <p className="text-3xl font-bold">{ebook.price_clp ? formatPrice(ebook.price_clp) : "Gratis"}</p>
                <Button className="w-full" onClick={handleBuy} disabled={checkoutLoading}>
                  {checkoutLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Comprar
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {ebook.description && (
          <Card>
            <CardContent className="p-6 prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(ebook.description) }} />
          </Card>
        )}
      </div>
      <GuestCheckoutDialog
        open={guestDialogOpen}
        onOpenChange={setGuestDialogOpen}
        onSubmit={submitGuestData}
        loading={checkoutLoading}
      />
    </>
  );
}
