import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMercadoPagoCheckout } from '@/hooks/useMercadoPagoCheckout';
import { GuestCheckoutDialog } from '@/components/checkout/GuestCheckoutDialog';
import { CheckoutPageRenderer } from '@/components/checkout-blocks/CheckoutPageRenderer';
import { DEFAULT_BLOCKS, DEFAULT_THEME } from '@/lib/checkoutBlocks';
import { initPixel, trackEventFor } from '@/lib/metaPixel';
import { Loader2 } from 'lucide-react';

interface Props { embed?: boolean }

const GUEST_PREFILL_KEY = 'novu:guest_checkout';
const GUEST_PREFILL_TTL_MS = 30 * 60 * 1000;

export default function CheckoutPage({ embed = false }: Props) {
  const { creatorSlug, pageSlug } = useParams();
  const [includeBump, setIncludeBump] = useState(false);
  const { startCheckout, checkoutAsGuest, loading, guestDialogOpen, setGuestDialogOpen, submitGuestData } = useMercadoPagoCheckout();

  // Get checkout page (RPC returns only safe columns) — includes creator_id
  const { data: page, isLoading } = useQuery({
    queryKey: ['public-checkout-page', creatorSlug, pageSlug],
    enabled: !!creatorSlug && !!pageSlug,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_checkout_page', {
        _creator_slug: creatorSlug!,
        _page_slug: pageSlug!,
      });
      if (error) throw error;
      return (data && data.length > 0) ? data[0] as any : null;
    },
  });

  // Get creator public info via secure RPCs
  const { data: creator } = useQuery({
    queryKey: ['creator-by-slug', creatorSlug],
    enabled: !!creatorSlug,
    queryFn: async () => {
      const { data } = await supabase.rpc('get_public_creator_profile', { _slug: creatorSlug! });
      const base = (data && data.length > 0) ? data[0] : null;
      if (!base) return null;
      const { data: pixel } = await supabase.rpc('get_creator_pixel_id', { _creator_slug: creatorSlug! });
      return { ...base, meta_pixel_id: (pixel as string | null) ?? null };
    },
  });

  // Load main + bump products
  const { data: products } = useQuery({
    queryKey: ['checkout-products', page?.id],
    enabled: !!page,
    queryFn: async () => {
      const fetchOne = async (type: string, id: string) => {
        if (type === 'course') return (await supabase.from('courses').select('id, title, description, price_clp, cover_image_url').eq('id', id).maybeSingle()).data;
        if (type === 'ebook') return (await supabase.from('ebooks').select('id, title, description, price_clp, cover_image_url').eq('id', id).maybeSingle()).data;
        if (type === 'event') return (await supabase.from('events').select('id, title, description, price_clp, cover_image_url').eq('id', id).maybeSingle()).data;
        if (type === 'community') {
          const { data } = await supabase.from('communities').select('id, name, description, price_clp, cover_url').eq('id', id).maybeSingle();
          return data ? { id: data.id, title: data.name, description: data.description, price_clp: data.price_clp, cover_image_url: data.cover_url } : null;
        }
        return null;
      };

      const main = await fetchOne(page.product_type, page.product_id);
      const bump = page.bump_enabled && page.bump_product_id
        ? await fetchOne(page.bump_product_type, page.bump_product_id) : null;
      return { main, bump };
    },
  });

  // Meta Pixel: ViewContent (fires once per product on this checkout)
  const viewContentFiredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!products?.main || !creator) return;
    const key = `${page.product_id}:${creator.meta_pixel_id ?? ''}`;
    if (viewContentFiredRef.current === key) return;
    const params = {
      value: products.main.price_clp, currency: 'CLP',
      content_type: 'product',
      content_category: page.product_type,
      content_ids: [page.product_id],
      content_name: products.main.title,
    };
    if (creator.meta_pixel_id) {
      viewContentFiredRef.current = key;
      initPixel(creator.meta_pixel_id);
      trackEventFor(creator.meta_pixel_id, 'ViewContent', params);
    }
  }, [products?.main, creator, page]);

  // Embed: report height to parent
  useEffect(() => {
    if (!embed) return;
    const send = () => {
      window.parent?.postMessage(
        { type: 'novu:resize', height: document.body.scrollHeight },
        '*'
      );
    };
    send();
    const ro = new ResizeObserver(send);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [embed, page, products]);

  if (isLoading || !page || !products?.main) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const bumpFinal = products.bump
    ? Math.round(products.bump.price_clp * (100 - (page.bump_discount_pct ?? 0)) / 100)
    : 0;

  const readGuestPrefill = () => {
    try {
      const raw = sessionStorage.getItem(GUEST_PREFILL_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        productType: string; productId: string;
        name: string; email: string; phone: string; ts: number;
      };
      if (parsed.productType !== page.product_type || parsed.productId !== page.product_id) return null;
      if (Date.now() - parsed.ts > GUEST_PREFILL_TTL_MS) return null;
      return parsed;
    } catch { return null; }
  };

  const onCheckout = () => {
    const meta = {
      value: products.main!.price_clp + (includeBump ? bumpFinal : 0),
      creatorPixelId: creator?.meta_pixel_id,
      contentName: products.main!.title,
      checkoutPageId: page.id,
      includeBump,
    };
    const prefill = readGuestPrefill();
    if (prefill) {
      // Guest already left their details on the product page — go straight to MP.
      sessionStorage.removeItem(GUEST_PREFILL_KEY);
      checkoutAsGuest(page.product_type, page.product_id, meta, {
        name: prefill.name, email: prefill.email, phone: prefill.phone,
      });
      return;
    }
    startCheckout(page.product_type, page.product_id, meta);
  };

  return (
    <>
      <CheckoutPageRenderer
        blocks={page.blocks?.length ? page.blocks : DEFAULT_BLOCKS}
        theme={page.theme ?? DEFAULT_THEME}
        product={{
          title: products.main.title,
          price_clp: products.main.price_clp,
          cover_image_url: products.main.cover_image_url,
        }}
        bump={{
          enabled: !!products.bump,
          product: products.bump ? {
            title: products.bump.title,
            price_clp: products.bump.price_clp,
            cover_image_url: (products.bump as any).cover_image_url,
            description: (products.bump as any).description,
          } : undefined,
          headline: page.bump_headline,
          description: page.bump_description,
          originalPrice: products.bump?.price_clp,
          finalPrice: bumpFinal,
        }}
        includeBump={includeBump}
        onToggleBump={setIncludeBump}
        onCheckout={onCheckout}
        loading={loading}
        embed={embed}
      />
      <GuestCheckoutDialog
        open={guestDialogOpen}
        onOpenChange={setGuestDialogOpen}
        onSubmit={submitGuestData}
        loading={loading}
      />
    </>
  );
}
