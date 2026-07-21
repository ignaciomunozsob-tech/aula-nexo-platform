import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useMercadoPagoCheckout } from '@/hooks/useMercadoPagoCheckout';
import { useAuth } from '@/lib/auth';
import { GuestCheckoutDialog } from '@/components/checkout/GuestCheckoutDialog';
import { CheckoutPageRenderer, type ContactState } from '@/components/checkout-blocks/CheckoutPageRenderer';
import { DEFAULT_BLOCKS, DEFAULT_THEME } from '@/lib/checkoutBlocks';
import { initPixel, trackEventFor } from '@/lib/metaPixel';
import { Loader2 } from 'lucide-react';

interface Props { embed?: boolean }

const GUEST_PREFILL_KEY = 'novu:guest_checkout';
const GUEST_PREFILL_TTL_MS = 30 * 60 * 1000;

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa tu nombre completo').max(100),
  email: z.string().trim().toLowerCase().email('Correo electrónico inválido').max(254),
  phone: z.string().trim().min(6, 'Ingresa un teléfono válido').max(30),
});

export default function CheckoutPage({ embed = false }: Props) {
  const { creatorSlug, pageSlug } = useParams();
  const { user, profile } = useAuth();
  const [includeBump, setIncludeBump] = useState(false);
  const [contact, setContact] = useState<ContactState>({ name: '', email: '', phone: '' });
  const [contactError, setContactError] = useState<string | null>(null);
  const { checkoutAsGuest, loading, guestDialogOpen, setGuestDialogOpen, submitGuestData } = useMercadoPagoCheckout();

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

  // Prefill contact from session storage (guest already left details on the product page)
  // or from the current logged-in user profile.
  const prefillReadRef = useRef(false);
  useEffect(() => {
    if (prefillReadRef.current || !page) return;
    prefillReadRef.current = true;
    try {
      const raw = sessionStorage.getItem(GUEST_PREFILL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          productType: string; productId: string;
          name: string; email: string; phone: string; ts: number;
        };
        if (parsed.productType === page.product_type
          && parsed.productId === page.product_id
          && Date.now() - parsed.ts <= GUEST_PREFILL_TTL_MS) {
          setContact({ name: parsed.name ?? '', email: parsed.email ?? '', phone: parsed.phone ?? '' });
          return;
        }
      }
    } catch { /* noop */ }
    if (user) {
      setContact((c) => ({
        name: c.name || profile?.name || (user.user_metadata?.name as string) || '',
        email: c.email || user.email || '',
        phone: c.phone || (user.user_metadata?.phone as string) || '',
      }));
    }
  }, [page, user, profile]);

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

  const onCheckout = () => {
    const parsed = contactSchema.safeParse(contact);
    if (!parsed.success) {
      setContactError(parsed.error.issues[0]?.message ?? 'Completa tus datos de contacto');
      return;
    }
    setContactError(null);
    sessionStorage.removeItem(GUEST_PREFILL_KEY);
    const meta = {
      value: products.main!.price_clp + (includeBump ? bumpFinal : 0),
      creatorPixelId: creator?.meta_pixel_id,
      contentName: products.main!.title,
      checkoutPageId: page.id,
      includeBump,
    };
    // Same path for guests and logged-in users: send name/email/phone so the creator's
    // panel de inscritos siempre tiene los datos de contacto reales del comprador.
    checkoutAsGuest(page.product_type, page.product_id, meta, parsed.data);
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
        contact={contact}
        onContactChange={(patch) => { setContact((c) => ({ ...c, ...patch })); if (contactError) setContactError(null); }}
        contactError={contactError}
        emailReadOnly={!!user}
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
