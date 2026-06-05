import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

type ProductType = 'course' | 'ebook' | 'event' | 'community';

export function useMercadoPagoCheckout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const startCheckout = async (productType: ProductType, productId: string) => {
    if (!user) {
      toast.error('Inicia sesión para continuar');
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { product_type: productType, product_id: productId },
      });
      if (error) throw error;
      const url = data?.sandbox_init_point || data?.init_point;
      if (!url) throw new Error('No se obtuvo el link de pago');
      window.location.href = url;
    } catch (e: any) {
      console.error(e);
      toast.error('No se pudo iniciar el pago: ' + (e?.message ?? 'error desconocido'));
      setLoading(false);
    }
  };

  return { startCheckout, loading };
}
