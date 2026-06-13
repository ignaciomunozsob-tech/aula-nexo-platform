import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { trackEvent, trackEventFor } from '@/lib/metaPixel';

type ProductType = 'course' | 'ebook' | 'event' | 'community';

interface CheckoutMeta {
  value?: number;
  creatorPixelId?: string | null;
  contentName?: string;
  checkoutPageId?: string;
  includeBump?: boolean;
}

export function useMercadoPagoCheckout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const startCheckout = async (
    productType: ProductType,
    productId: string,
    meta: CheckoutMeta = {}
  ) => {
    if (!user) {
      toast.error('Inicia sesión para continuar');
      navigate('/login');
      return;
    }
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
        },
      });
      if (error) throw error;
      const url = data?.sandbox_init_point || data?.init_point;
      if (!url) throw new Error('No se obtuvo el link de pago');
      // If we're inside an iframe (embed), break out to top window
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

  return { startCheckout, loading };
}
