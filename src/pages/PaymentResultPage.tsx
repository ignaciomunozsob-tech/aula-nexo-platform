import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { initPixel, trackEvent, trackEventFor } from '@/lib/metaPixel';

export default function PaymentResultPage() {
  const { result } = useParams<{ result: 'success' | 'failure' | 'pending' }>();
  const [params] = useSearchParams();
  const orderId = params.get('order');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let attempts = 0;
    const poll = async () => {
      if (!orderId) { setLoading(false); return; }
      while (active && attempts < 6) {
        const { data } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
        if (data) {
          setOrder(data);
          if (data.status !== 'pending') break;
        }
        attempts++;
        await new Promise((r) => setTimeout(r, 1500));
      }
      setLoading(false);
    };
    poll();
    return () => { active = false; };
  }, [orderId]);

  const isPaid = order?.status === 'paid' || result === 'success';
  const isFailed = order?.status === 'failed' || result === 'failure';

  // Fire Meta Pixel Purchase event once when payment is confirmed
  const firedPurchaseRef = useRef(false);
  useEffect(() => {
    if (!isPaid || firedPurchaseRef.current || !order) return;
    firedPurchaseRef.current = true;
    const params = {
      value: order.amount_clp ?? 0,
      currency: 'CLP',
      content_type: order.product_type,
      content_ids: [order.product_id],
      order_id: order.id,
    };
    trackEvent('Purchase', params);

    // Fire on creator's pixel as well (if configured)
    (async () => {
      if (!order.creator_id) return;
      const { data: creator } = await supabase
        .from('profiles')
        .select('meta_pixel_id')
        .eq('id', order.creator_id)
        .maybeSingle();
      const pid = (creator as any)?.meta_pixel_id as string | null | undefined;
      if (pid) {
        initPixel(pid);
        trackEventFor(pid, 'Purchase', params);
      }
    })();
  }, [isPaid, order]);

  const productLink = order ? linkFor(order.product_type, order.product_id) : '/';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        {loading ? (
          <>
            <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin mb-4" />
            <h1 className="text-xl font-bold">Confirmando pago...</h1>
            <p className="text-sm text-muted-foreground mt-2">Esto toma unos segundos.</p>
          </>
        ) : isPaid ? (
          <>
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600 mb-4" />
            <h1 className="text-2xl font-bold mb-2">¡Pago confirmado!</h1>
            <p className="text-muted-foreground mb-6">
              Tu compra fue procesada con éxito. Ya tienes acceso al contenido.
            </p>
            <Button asChild className="w-full">
              <Link to={productLink}>Ir al contenido</Link>
            </Button>
          </>
        ) : isFailed ? (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Pago no completado</h1>
            <p className="text-muted-foreground mb-6">
              Algo salió mal con el pago. No te preocupes, no se realizó ningún cobro.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">Volver al inicio</Link>
            </Button>
          </>
        ) : (
          <>
            <Clock className="h-12 w-12 mx-auto text-amber-600 mb-4" />
            <h1 className="text-2xl font-bold mb-2">Pago en revisión</h1>
            <p className="text-muted-foreground mb-6">
              MercadoPago está procesando tu pago. Te notificaremos cuando se confirme.
            </p>
            <Button asChild className="w-full">
              <Link to="/app">Ir a mi cuenta</Link>
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}

function linkFor(type: string, id: string) {
  switch (type) {
    case 'course': return `/app/course/${id}`;
    case 'event': return `/app`;
    case 'ebook': return `/app`;
    case 'community': return `/app`;
    default: return '/';
  }
}
