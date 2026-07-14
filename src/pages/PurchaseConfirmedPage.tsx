import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, ExternalLink, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { initPixel, trackEvent, trackEventFor } from '@/lib/metaPixel';
import { NOVU_META_PIXEL_ID } from '@/config/branding';
import { SEO } from '@/components/SEO';

type OrderRow = {
  id: string;
  reference: string;
  status: string;
  product_type: string;
  product_id: string;
  product_title: string | null;
  product_cover_url: string | null;
  amount_clp: number;
  installments: number | null;
  creator_id: string | null;
  creator_name: string | null;
  creator_slug: string | null;
  buyer_email: string | null;
  is_new_user: boolean;
  pixel_fired: boolean;
  redirect_url: string | null;
  product_url: string | null;
};

function productLink(row: OrderRow): string {
  if (row.product_url) return row.product_url;
  switch (row.product_type) {
    case 'course':
      return `/app/course/${row.product_id}`;
    case 'ebook':
    case 'event':
    case 'community':
      return '/app/my-courses';
    default:
      return '/app';
  }
}

function formatInstallments(n: number | null): string {
  if (!n || n <= 1) return '1 cuota';
  return `${n} cuotas sin interés`;
}

export default function PurchaseConfirmedPage() {
  const { reference } = useParams<{ reference: string }>();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  // Poll until paid (webhook may lag a moment)
  useEffect(() => {
    let active = true;
    let attempts = 0;
    const run = async () => {
      if (!reference) {
        setLoading(false);
        return;
      }
      while (active && attempts < 8) {
        const { data } = await supabase.rpc('get_order_by_reference', { _reference: reference });
        const row = Array.isArray(data) ? (data[0] as OrderRow | undefined) : null;
        if (row) {
          setOrder(row);
          if (row.status === 'paid') break;
        }
        attempts++;
        await new Promise((r) => setTimeout(r, 1500));
      }
      setLoading(false);
    };
    run();
    return () => {
      active = false;
    };
  }, [reference]);

  // Fire Meta Pixel Purchase once
  const firedRef = useRef(false);
  useEffect(() => {
    if (!order || order.status !== 'paid' || firedRef.current) return;
    if (order.pixel_fired) {
      firedRef.current = true;
      return;
    }
    const sessionKey = `novu_pixel_fired_${order.reference}`;
    if (typeof window !== 'undefined' && window.sessionStorage.getItem(sessionKey)) {
      firedRef.current = true;
      return;
    }
    firedRef.current = true;

    (async () => {
      let pixelId: string | null = null;
      if (order.creator_id) {
        const { data } = await supabase.rpc('get_creator_pixel_id_by_id', { _creator_id: order.creator_id });
        pixelId = (data as string | null) ?? null;
      }
      const params = {
        value: order.amount_clp,
        currency: 'CLP',
        content_name: order.product_title ?? '',
        content_type: 'product',
        content_category: order.product_type ?? undefined,
        content_ids: [order.product_id],
        num_items: 1,
      };
      if (pixelId) {
        initPixel(pixelId);
        trackEventFor(pixelId, 'Purchase', params);
      } else if (NOVU_META_PIXEL_ID) {
        initPixel(NOVU_META_PIXEL_ID);
        trackEvent('Purchase', params);
      }
      window.sessionStorage.setItem(sessionKey, '1');
      await supabase.rpc('mark_order_pixel_fired', { _reference: order.reference });
    })();
  }, [order]);

  // Auto-redirect after successful payment if creator configured a redirect URL.
  const redirectedRef = useRef(false);
  useEffect(() => {
    if (!order || order.status !== 'paid' || !order.redirect_url || redirectedRef.current) return;
    if (redirectCountdown <= 0) {
      redirectedRef.current = true;
      if (window.top && window.top !== window.self) window.top.location.href = order.redirect_url;
      else window.location.href = order.redirect_url;
      return;
    }
    const timer = window.setTimeout(() => setRedirectCountdown((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [order, redirectCountdown]);

  if (loading && !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center">
          <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Confirmando tu compra…</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full p-8 text-center">
          <h1 className="text-xl font-bold mb-2">No encontramos esta compra</h1>
          <p className="text-muted-foreground mb-6">Verifica el enlace o revisa tu correo.</p>
          <Button asChild className="w-full">
            <Link to="/courses">Explorar productos</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const hasAccount = !order.is_new_user;
  const targetLink = productLink(order);
  const redirectUrl = order.status === 'paid' ? order.redirect_url : null;

  return (
    <div className="min-h-screen flex items-start md:items-center justify-center p-4 bg-background">
      <div className="w-full max-w-[560px] mx-auto py-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center rounded-full mb-4"
            style={{
              width: 64,
              height: 64,
              backgroundColor: '#fcc70e',
              animation: 'novu-pop 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <CheckCircle2 className="h-9 w-9 text-black" strokeWidth={2.5} />
          </div>
          <h1 className="font-extrabold text-3xl tracking-tight" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 800 }}>
            Compra confirmada
          </h1>
          <p className="text-muted-foreground mt-2">Gracias por tu compra. Aquí tienes el resumen.</p>
        </div>

        {/* Summary card */}
        <Card className="rounded-2xl p-6 border">
          {order.product_cover_url && (
            <div className="mb-4 overflow-hidden rounded-xl aspect-video bg-muted">
              <img
                src={order.product_cover_url}
                alt={order.product_title ?? ''}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <h2 className="text-lg font-bold" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
            {order.product_title ?? 'Producto'}
          </h2>
          {order.creator_name && (
            <p className="text-sm text-muted-foreground mt-1">por {order.creator_name}</p>
          )}

          <div className="my-5 border-t" />

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Monto pagado</dt>
              <dd className="font-semibold">${order.amount_clp.toLocaleString('es-CL')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Cuotas</dt>
              <dd className="font-medium">{formatInstallments(order.installments)}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-muted-foreground">Referencia</dt>
              <dd className="font-mono text-xs text-muted-foreground">{order.reference}</dd>
            </div>
          </dl>
        </Card>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          {redirectUrl && (
            <>
              <Button
                asChild
                className="w-full h-12 font-semibold"
                style={{ backgroundColor: '#fcc70e', color: '#0a0a0a' }}
              >
                <a href={redirectUrl}>
                  Continuar <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Serás redirigido en {redirectCountdown} s…
              </p>
            </>
          )}

          {hasAccount ? (
            <Button
              asChild
              variant={redirectUrl ? 'outline' : 'default'}
              className="w-full h-12 font-semibold"
              style={redirectUrl ? undefined : { backgroundColor: '#fcc70e', color: '#0a0a0a' }}
            >
              <Link to={targetLink}>Acceder ahora →</Link>
            </Button>
          ) : (
            <Card className="p-4 flex gap-3 items-start bg-muted/40">
              <div className="mt-0.5">
                <Mail className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  Te enviamos un email a{' '}
                  <span className="font-semibold">{order.buyer_email ?? 'tu correo'}</span> para que configures tu
                  contraseña y accedas a tu compra.
                </p>
                <p className="text-xs text-muted-foreground mt-1">Revisa también tu carpeta de spam.</p>
              </div>
            </Card>
          )}

          <Button asChild variant="outline" className="w-full h-12">
            <Link to="/courses">Explorar más productos →</Link>
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes novu-pop {
          0% { transform: scale(0.4); opacity: 0; }
          70% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
