import { useEffect, useState } from 'react';
import { Check, Shield, Star, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { CheckoutBlock, CheckoutTheme } from '@/lib/checkoutBlocks';

export interface ProductInfo {
  title: string;
  price_clp: number;
  cover_image_url?: string | null;
  description?: string | null;
}

export interface BumpInfo {
  enabled: boolean;
  product?: ProductInfo;
  headline?: string;
  description?: string;
  finalPrice?: number;
  originalPrice?: number;
}

interface Props {
  blocks: CheckoutBlock[];
  theme: CheckoutTheme;
  product: ProductInfo;
  bump: BumpInfo;
  includeBump: boolean;
  onToggleBump: (v: boolean) => void;
  onCheckout: () => void;
  loading?: boolean;
  embed?: boolean;
}

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);
}

function getYoutubeEmbed(url: string): string | null {
  const m = url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function Countdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const target = new Date(endsAt).getTime();
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <div className="flex gap-3 justify-center font-mono text-2xl font-bold">
      <span>{String(d).padStart(2, '0')}d</span>
      <span>{String(h).padStart(2, '0')}h</span>
      <span>{String(m).padStart(2, '0')}m</span>
      <span>{String(s).padStart(2, '0')}s</span>
    </div>
  );
}

export function CheckoutPageRenderer({
  blocks, theme, product, bump, includeBump, onToggleBump, onCheckout, loading, embed,
}: Props) {
  const total = product.price_clp + (bump.enabled && includeBump ? (bump.finalPrice ?? 0) : 0);

  const renderBlock = (b: CheckoutBlock) => {
    if (!b.enabled) return null;
    switch (b.type) {
      case 'hero':
        return (
          <section key={b.id} className="text-center space-y-4">
            {b.data.imageUrl && (
              <img src={b.data.imageUrl} alt={b.data.title} className="mx-auto rounded-xl max-h-64 object-cover" />
            )}
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: theme.primary }}>
              {b.data.title || product.title}
            </h1>
            {b.data.subtitle && <p className="text-lg text-muted-foreground">{b.data.subtitle}</p>}
          </section>
        );
      case 'video': {
        const src = getYoutubeEmbed(b.data.url || '');
        if (!src) return null;
        return (
          <section key={b.id}>
            <div className="aspect-video rounded-xl overflow-hidden">
              <iframe src={src} className="w-full h-full" allowFullScreen title="video" />
            </div>
          </section>
        );
      }
      case 'benefits':
        return (
          <section key={b.id}>
            {b.data.title && <h2 className="text-xl font-bold mb-3">{b.data.title}</h2>}
            <ul className="space-y-2">
              {(b.data.items ?? []).map((it: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: theme.primary }} />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </section>
        );
      case 'testimonials':
        return (
          <section key={b.id}>
            {b.data.title && <h2 className="text-xl font-bold mb-3">{b.data.title}</h2>}
            <div className="grid gap-3 md:grid-cols-2">
              {(b.data.items ?? []).map((t: any, i: number) => (
                <Card key={i} className="p-4">
                  <div className="flex gap-0.5 mb-2">
                    {Array.from({ length: t.rating || 5 }).map((_, k) => (
                      <Star key={k} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm mb-2">"{t.text}"</p>
                  <p className="text-xs font-semibold text-muted-foreground">— {t.name}</p>
                </Card>
              ))}
            </div>
          </section>
        );
      case 'guarantee':
        return (
          <section key={b.id}>
            <Card className="p-5 flex gap-3 items-start" style={{ borderColor: theme.primary }}>
              <Shield className="h-8 w-8 flex-shrink-0" style={{ color: theme.primary }} />
              <div>
                <h3 className="font-bold">{b.data.title}</h3>
                <p className="text-sm text-muted-foreground">{b.data.text}</p>
              </div>
            </Card>
          </section>
        );
      case 'faq':
        return (
          <section key={b.id}>
            {b.data.title && <h2 className="text-xl font-bold mb-3">{b.data.title}</h2>}
            <Accordion type="single" collapsible>
              {(b.data.items ?? []).map((it: any, i: number) => (
                <AccordionItem value={String(i)} key={i}>
                  <AccordionTrigger>{it.q}</AccordionTrigger>
                  <AccordionContent>{it.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        );
      case 'countdown':
        if (!b.data.endsAt) return null;
        return (
          <section key={b.id} className="text-center space-y-2">
            {b.data.title && <p className="font-semibold">{b.data.title}</p>}
            <Countdown endsAt={b.data.endsAt} />
          </section>
        );
      case 'summary':
        return (
          <section key={b.id}>
            <Card className="p-5 space-y-3">
              <h3 className="font-bold text-lg">Tu compra</h3>
              <div className="flex justify-between text-sm">
                <span>{product.title}</span>
                <span className="font-semibold">{formatCLP(product.price_clp)}</span>
              </div>

              {bump.enabled && bump.product && (
                <div className="rounded-lg border-2 border-dashed p-3" style={{ borderColor: theme.primary }}>
                  <label className="flex gap-3 cursor-pointer">
                    <Checkbox checked={includeBump} onCheckedChange={(v) => onToggleBump(!!v)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">
                        {bump.headline || `Suma ${bump.product.title}`}
                      </p>
                      <div className="flex gap-3 mt-2">
                        {bump.product.cover_image_url && (
                          <img
                            src={bump.product.cover_image_url}
                            alt={bump.product.title}
                            className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-xs font-medium truncate">{bump.product.title}</p>
                          {(bump.description || bump.product.description) && (
                            <p className="text-xs text-muted-foreground line-clamp-3">
                              {bump.description || bump.product.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-sm mt-2">
                        <span className="font-bold" style={{ color: theme.primary }}>
                          {formatCLP(bump.finalPrice ?? 0)}
                        </span>
                        {bump.originalPrice && bump.originalPrice > (bump.finalPrice ?? 0) && (
                          <span className="ml-2 line-through text-muted-foreground text-xs">
                            {formatCLP(bump.originalPrice)}
                          </span>
                        )}
                      </p>
                    </div>
                  </label>
                </div>
              )}


              <div className="flex justify-between pt-2 border-t font-bold">
                <span>Total</span>
                <span style={{ color: theme.primary }}>{formatCLP(total)}</span>
              </div>
            </Card>
          </section>
        );
      case 'checkout_button':
        return (
          <section key={b.id}>
            <Button
              size="lg"
              onClick={onCheckout}
              disabled={loading}
              className="w-full text-base font-bold py-6"
              style={{ backgroundColor: theme.primary }}
            >
              <Lock className="h-4 w-4 mr-2" />
              {loading ? 'Procesando...' : (b.data.label || 'Comprar ahora')}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              Pago seguro vía MercadoPago
            </p>
          </section>
        );
    }
  };

  return (
    <div
      className="min-h-screen py-8 px-4"
      style={{ backgroundColor: theme.background }}
    >
      <div className={embed ? 'max-w-2xl mx-auto space-y-6' : 'max-w-2xl mx-auto space-y-6'}>
        {blocks.map(renderBlock)}
        {!embed && (
          <p className="text-center text-xs text-muted-foreground pt-4">
            Procesado por <strong>NOVU</strong>
          </p>
        )}
      </div>
    </div>
  );
}
