import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { trackEvent, trackEventFor } from '@/lib/metaPixel';

type ProductType = 'course' | 'ebook' | 'event' | 'community';

interface CheckoutMeta {
  value?: number;
  creatorPixelId?: string | null;
  contentName?: string;
  checkoutPageId?: string;
  includeBump?: boolean;
}

interface PendingCheckout {
  productType: ProductType;
  productId: string;
  meta: CheckoutMeta;
}

export function useMercadoPagoCheckout() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [guestDialogOpen, setGuestDialogOpen] = useState(false);
  const [pending, setPending] = useState<PendingCheckout | null>(null);

  const doCheckout = async (
    productType: ProductType,
    productId: string,
    meta: CheckoutMeta,
    guestEmail?: string,
  ) => {
    setLoading(true);

    const params = {
      value: meta.value ?? undefined,
      currency: 'CLP',
      content_type: productType,
      content_ids: [productId],
      content_name: meta.contentName,
    };
    try {
      trackEvent('InitiateCheckout', params);
      if (meta.creatorPixelId) trackEventFor(meta.creatorPixelId, 'InitiateCheckout', params);
    } catch { /* noop */ }

    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          product_type: productType,
          product_id: productId,
          checkout_page_id: meta.checkoutPageId,
          include_bump: !!meta.includeBump,
          guest_email: guestEmail,
        },
      });
      if (error) throw error;
      // Producción: usar init_point. Solo caer a sandbox si MP no devolvió el de prod.
      const url = data?.init_point || data?.sandbox_init_point;
      if (!url) throw new Error('No se obtuvo el link de pago');
      if (window.top && window.top !== window.self) {
        window.top.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (e: any) {
      console.error(e);
      toast.error('No se pudo iniciar el pago: ' + (e?.message ?? 'error desconocido'));
      setLoading(false);
    }
  };

  const startCheckout = async (
    productType: ProductType,
    productId: string,
    meta: CheckoutMeta = {},
  ) => {
    if (user) {
      await doCheckout(productType, productId, meta);
      return;
    }
    // Guest flow: open dialog to collect email
    setPending({ productType, productId, meta });
    setGuestDialogOpen(true);
  };

  const submitGuestEmail = async (email: string) => {
    if (!pending) return;
    setGuestDialogOpen(false);
    await doCheckout(pending.productType, pending.productId, pending.meta, email);
    setPending(null);
  };

  return {
    startCheckout,
    loading,
    guestDialogOpen,
    setGuestDialogOpen,
    submitGuestEmail,
  };
}
