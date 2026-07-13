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
    guest?: { name: string; email: string; phone: string },
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
          guest_email: guest?.email,
          guest_name: guest?.name,
          guest_phone: guest?.phone,
        },
      });
      // supabase-js surfaces non-2xx as `error`, but the JSON body is still parseable via error.context.
      if (error) {
        let serverMsg: string | null = null;
        try {
          const resp = (error as any)?.context?.response ?? (error as any)?.context;
          if (resp && typeof resp.json === 'function') {
            const body = await resp.json();
            serverMsg = body?.message || body?.error || null;
          }
        } catch { /* noop */ }
        throw new Error(serverMsg ?? error.message ?? 'error desconocido');
      }
      const url = data?.init_point || data?.sandbox_init_point;
      if (!url) {
        // Edge function might respond 200 with an error payload — surface it.
        const serverMsg = (data as any)?.message || (data as any)?.error;
        throw new Error(serverMsg || 'No se obtuvo el link de pago');
      }
      if (window.top && window.top !== window.self) {
        window.top.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch (e: any) {
      console.error(e);
      const raw = String(e?.message ?? '');
      let friendly = raw || 'No se pudo iniciar el pago';
      if (raw.includes('creator_not_connected') || raw.includes('mercadopago_not_connected')) {
        friendly = 'Este creador aún no ha conectado su cuenta de pagos. Inténtalo más tarde.';
      } else if (raw.includes('product_not_found') || raw.includes('not_found')) {
        friendly = 'Este producto ya no está disponible.';
      }
      toast.error(friendly);
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
    // Guest flow: open dialog to collect name, email and phone
    setPending({ productType, productId, meta });
    setGuestDialogOpen(true);
  };

  const submitGuestData = async (data: { name: string; email: string; phone: string }) => {
    if (!pending) return;
    // Mostrar loading en el diálogo y el botón del producto mientras se contacta a MP
    setLoading(true);
    setGuestDialogOpen(false);
    await doCheckout(pending.productType, pending.productId, pending.meta, data);
    setPending(null);
  };

  return {
    startCheckout,
    loading,
    guestDialogOpen,
    setGuestDialogOpen,
    submitGuestData,
    /** @deprecated use submitGuestData */
    submitGuestEmail: async (email: string) => submitGuestData({ name: '', email, phone: '' }),
  };
}
