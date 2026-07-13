import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { initPixel, trackEvent, trackEventFor } from '@/lib/metaPixel';

export default function PaymentResultPage() {
  const { result } = useParams<{ result: 'success' | 'failure' | 'pending' }>();
  const [params] = useSearchParams();
  const orderId = params.get('order');
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Legacy redirect: /payment/success -> /compra-confirmada/{reference}
  useEffect(() => {
    if (result !== 'success' || !orderId) return;
    let cancelled = false;
    (async () => {
      // The public order RPC doesn't return reference; fetch it via a light select
      const { data } = await supabase
        .from('orders')
        .select('reference')
        .eq('id', orderId)
        .maybeSingle();
      if (!cancelled && data?.reference) {
        navigate(`/compra-confirmada/${data.reference}`, { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [result, orderId, navigate]);

  useEffect(() => {
    let active = true;
    let attempts = 0;
    const poll = async () => {
      if (!orderId) { setLoading(false); return; }
      while (active && attempts < 6) {
        const { data } = await supabase.rpc('get_order_public', { _order_id: orderId });
        const row = Array.isArray(data) ? data[0] : null;
        if (row) {
          // Adapt RPC shape to match previous order shape
          setOrder({
            id: row.id,
            status: row.status,
            product_type: row.product_type,
            product_id: row.product_id,
            amount_clp: row.amount_clp,
            creator_id: row.creator_id,
            guest_email: row.guest_email,
            redirect_url: (row as any).redirect_url ?? null,
            product_url: (row as any).product_url ?? null,
            metadata: { is_new_user: row.is_new_user, redirect_url: (row as any).redirect_url ?? null, product_url: (row as any).product_url ?? null },
          });
          if (row.status !== 'pending') break;
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
      content_type: 'product',
      content_category: order.product_type,
      content_ids: [order.product_id],
      order_id: order.id,
    };
    trackEvent('Purchase', params);

    // Fire on creator's pixel as well (if configured)
    (async () => {
      if (!order.creator_id) return;
      const { data: pid } = await supabase.rpc('get_creator_pixel_id_by_id', { _creator_id: order.creator_id });
      const pixelId = pid as string | null;
      if (pixelId) {
        initPixel(pixelId);
        trackEventFor(pixelId, 'Purchase', params);
      }
    })();
  }, [isPaid, order]);

  // Auto-redirect after successful payment if creator configured a redirect URL
  const redirectedRef = useRef(false);
  const [countdown, setCountdown] = useState(5);
  const redirectUrl: string | null = order?.redirect_url ?? null;
  useEffect(() => {
    if (!isPaid || !redirectUrl || redirectedRef.current) return;
    if (countdown <= 0) {
      redirectedRef.current = true;
      if (window.top && window.top !== window.self) window.top.location.href = redirectUrl;
      else window.location.href = redirectUrl;
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [isPaid, redirectUrl, countdown]);

  const productPublicUrl: string | null = order?.product_url ?? null;
  const productLink = productPublicUrl || (order ? linkFor(order.product_type, order.product_id) : '/');

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
            {order?.metadata?.is_new_user && order?.guest_email && (
              <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20 text-left">
                <p className="text-sm font-medium mb-1">📩 Configura tu contraseña</p>
                <p className="text-sm text-muted-foreground">
                  Te enviamos un correo a <span className="font-medium">{order.guest_email}</span> con un enlace para crear tu contraseña y acceder a tu cuenta en NOVU.
                </p>
              </div>
            )}
            {redirectUrl ? (
              <>
                <Button asChild className="w-full">
                  <a href={redirectUrl}>Continuar</a>
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Serás redirigido en {countdown} s…
                </p>
                <Button asChild variant="ghost" className="w-full mt-2">
                  <Link to={productLink}>Ir al contenido</Link>
                </Button>
              </>
            ) : (
              <Button asChild className="w-full">
                <Link to={productLink}>Ir al contenido</Link>
              </Button>
            )}
          </>
        ) : isFailed ? (
          <>
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Pago no completado</h1>
            <p className="text-muted-foreground mb-6">
              Algo salió mal con el pago. No te preocupes, no se realizó ningún cobro. Puedes volver a intentarlo desde la página del producto.
            </p>
            {productPublicUrl ? (
              <Button asChild className="w-full">
                <a href={productPublicUrl}>Volver al producto</a>
              </Button>
            ) : (
              <Button asChild className="w-full">
                <Link to={productLink}>Volver al producto</Link>
              </Button>
            )}
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
    case 'ebook': return `/app/my-courses`;
    case 'event': return `/app/my-courses`;
    case 'community': return `/app/my-courses`;
    default: return '/app';
  }
}
