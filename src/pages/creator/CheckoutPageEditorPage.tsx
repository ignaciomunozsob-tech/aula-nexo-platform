import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowDown, ArrowUp, Lock, ArrowLeft, Save, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  BLOCK_LABELS, DEFAULT_BLOCKS, DEFAULT_THEME, LOCKED_BLOCKS,
  type CheckoutBlock, type CheckoutTheme,
} from '@/lib/checkoutBlocks';
import { CheckoutPageRenderer } from '@/components/checkout-blocks/CheckoutPageRenderer';

type ProductType = 'course' | 'ebook' | 'event' | 'community';

export default function CheckoutPageEditorPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('Página de pago');
  const [slug, setSlug] = useState('');
  const [productType, setProductType] = useState<ProductType>('course');
  const [productId, setProductId] = useState<string>('');
  const [isPublished, setIsPublished] = useState(false);
  const [blocks, setBlocks] = useState<CheckoutBlock[]>(DEFAULT_BLOCKS);
  const [theme, setTheme] = useState<CheckoutTheme>(DEFAULT_THEME);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('hero');

  // Order bump
  const [bumpEnabled, setBumpEnabled] = useState(false);
  const [bumpProductType, setBumpProductType] = useState<ProductType>('ebook');
  const [bumpProductId, setBumpProductId] = useState<string>('');
  const [bumpDiscountPct, setBumpDiscountPct] = useState(0);
  const [bumpHeadline, setBumpHeadline] = useState('¡Agrega esto a tu compra!');
  const [bumpDescription, setBumpDescription] = useState('');

  // Load existing
  useQuery({
    queryKey: ['checkout-page', id],
    enabled: !isNew && !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('checkout_pages').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (data) {
        setName(data.name); setSlug(data.slug);
        setProductType(data.product_type); setProductId(data.product_id);
        setIsPublished(data.is_published);
        setBlocks(Array.isArray(data.blocks) && data.blocks.length ? data.blocks : DEFAULT_BLOCKS);
        setTheme(data.theme ?? DEFAULT_THEME);
        setBumpEnabled(data.bump_enabled);
        if (data.bump_product_type) setBumpProductType(data.bump_product_type);
        if (data.bump_product_id) setBumpProductId(data.bump_product_id);
        setBumpDiscountPct(data.bump_discount_pct ?? 0);
        setBumpHeadline(data.bump_headline ?? '¡Agrega esto a tu compra!');
        setBumpDescription(data.bump_description ?? '');
      }
      return data;
    },
  });

  // Products for selectors
  const { data: products } = useQuery({
    queryKey: ['creator-all-products', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [c, e, ev, cm] = await Promise.all([
        supabase.from('courses').select('id, title, price_clp, cover_image_url').eq('creator_id', user!.id),
        supabase.from('ebooks').select('id, title, price_clp, cover_image_url').eq('creator_id', user!.id),
        supabase.from('events').select('id, title, price_clp, cover_image_url').eq('creator_id', user!.id),
        supabase.from('communities').select('id, name, price_clp, cover_url').eq('creator_id', user!.id),
      ]);
      return {
        course: c.data ?? [],
        ebook: e.data ?? [],
        event: ev.data ?? [],
        community: (cm.data ?? []).map((x: any) => ({ ...x, title: x.name, cover_image_url: x.cover_url })),
      } as Record<ProductType, any[]>;
    },
  });

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);
  const mainProduct = useMemo(() => {
    const arr = products?.[productType] ?? [];
    return arr.find((p: any) => p.id === productId);
  }, [products, productType, productId]);

  const bumpProduct = useMemo(() => {
    const arr = products?.[bumpProductType] ?? [];
    return arr.find((p: any) => p.id === bumpProductId);
  }, [products, bumpProductType, bumpProductId]);

  const updateBlock = (id: string, patch: Partial<CheckoutBlock>) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };
  const updateBlockData = (id: string, dataPatch: Record<string, any>) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, data: { ...b.data, ...dataPatch } } : b)));
  };
  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks((bs) => {
      const i = bs.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= bs.length) return bs;
      const next = [...bs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const save = async (publish?: boolean) => {
    if (!user) return;
    if (!productId) { toast.error('Selecciona un producto'); return; }
    if (!/^[a-z0-9-]{3,40}$/.test(slug)) { toast.error('Slug inválido (a-z, 0-9, -, 3-40 chars)'); return; }
    setSaving(true);
    const payload: any = {
      creator_id: user.id,
      product_type: productType, product_id: productId,
      name, slug, is_published: publish ?? isPublished,
      blocks, theme,
      bump_enabled: bumpEnabled,
      bump_product_type: bumpEnabled ? bumpProductType : null,
      bump_product_id: bumpEnabled ? bumpProductId || null : null,
      bump_discount_pct: bumpDiscountPct,
      bump_headline: bumpHeadline,
      bump_description: bumpDescription,
    };
    try {
      if (isNew) {
        const { data, error } = await (supabase as any).from('checkout_pages').insert(payload).select().single();
        if (error) throw error;
        toast.success('Página creada');
        navigate(`/creator-app/checkout-pages/${data.id}/edit`, { replace: true });
      } else {
        const { error } = await (supabase as any).from('checkout_pages').update(payload).eq('id', id);
        if (error) throw error;
        if (publish !== undefined) setIsPublished(publish);
        toast.success(publish ? 'Página publicada' : 'Cambios guardados');
      }
    } catch (e: any) {
      toast.error(e.message ?? 'Error al guardar');
    } finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate('/creator-app/checkout-pages')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Volver
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save(false)} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> Guardar borrador
          </Button>
          <Button onClick={() => save(true)} disabled={saving}>
            <Eye className="h-4 w-4 mr-1" /> {isPublished ? 'Guardar y publicar' : 'Publicar'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="design">
        <TabsList>
          <TabsTrigger value="design">Diseño</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
          <TabsTrigger value="bump">Order bump</TabsTrigger>
        </TabsList>

        <TabsContent value="design">
          <div className="grid lg:grid-cols-[280px_1fr_320px] gap-4">
            {/* Block list */}
            <Card className="p-3 h-fit">
              <h3 className="font-semibold text-sm mb-2">Bloques</h3>
              <div className="space-y-1">
                {blocks.map((b, i) => {
                  const locked = LOCKED_BLOCKS.includes(b.type);
                  return (
                    <div key={b.id}
                      className={`flex items-center gap-1 p-2 rounded border ${selectedBlockId === b.id ? 'bg-primary/5 border-primary' : 'border-transparent'}`}
                    >
                      <button className="flex-1 text-left text-sm" onClick={() => setSelectedBlockId(b.id)}>
                        {BLOCK_LABELS[b.type]}
                      </button>
                      {locked ? (
                        <Lock className="h-3 w-3 text-muted-foreground" />
                      ) : (
                        <Switch checked={b.enabled} onCheckedChange={(v) => updateBlock(b.id, { enabled: v })} />
                      )}
                      <button onClick={() => moveBlock(b.id, -1)} disabled={i === 0} className="p-1 disabled:opacity-30">
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button onClick={() => moveBlock(b.id, 1)} disabled={i === blocks.length - 1} className="p-1 disabled:opacity-30">
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Preview */}
            <div className="border rounded-lg overflow-hidden bg-muted/30">
              <CheckoutPageRenderer
                blocks={blocks} theme={theme}
                product={{
                  title: mainProduct?.title ?? 'Producto',
                  price_clp: mainProduct?.price_clp ?? 0,
                  cover_image_url: mainProduct?.cover_image_url,
                }}
                bump={{
                  enabled: bumpEnabled && !!bumpProduct,
                  product: bumpProduct ? { title: bumpProduct.title, price_clp: bumpProduct.price_clp } : undefined,
                  headline: bumpHeadline, description: bumpDescription,
                  originalPrice: bumpProduct?.price_clp,
                  finalPrice: bumpProduct ? Math.round(bumpProduct.price_clp * (100 - bumpDiscountPct) / 100) : 0,
                }}
                includeBump={true}
                onToggleBump={() => {}}
                onCheckout={() => toast.info('Vista previa')}
              />
            </div>

            {/* Block properties */}
            <Card className="p-4 h-fit space-y-3">
              <h3 className="font-semibold text-sm">Propiedades · {selectedBlock && BLOCK_LABELS[selectedBlock.type]}</h3>
              {selectedBlock && <BlockPropertyEditor block={selectedBlock} onChange={(d) => updateBlockData(selectedBlock.id, d)} />}
              <hr />
              <div>
                <Label className="text-xs">Color principal</Label>
                <Input type="color" value={theme.primary} onChange={(e) => setTheme({ ...theme, primary: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Fondo</Label>
                <Input type="color" value={theme.background} onChange={(e) => setTheme({ ...theme, background: e.target.value })} />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="config">
          <Card className="p-4 space-y-4 max-w-2xl">
            <div>
              <Label>Nombre interno</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Slug de URL</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="oferta-black-friday" />
              <p className="text-xs text-muted-foreground mt-1">Minúsculas, números y guiones. 3-40 caracteres.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de producto</Label>
                <Select value={productType} onValueChange={(v) => { setProductType(v as ProductType); setProductId(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="course">Curso</SelectItem>
                    <SelectItem value="ebook">Ebook</SelectItem>
                    <SelectItem value="event">Evento</SelectItem>
                    <SelectItem value="community">Comunidad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Producto</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {(products?.[productType] ?? []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="bump">
          <Card className="p-4 space-y-4 max-w-2xl">
            <div className="flex items-center gap-2">
              <Switch checked={bumpEnabled} onCheckedChange={setBumpEnabled} />
              <Label>Activar order bump</Label>
            </div>
            {bumpEnabled && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo de producto bump</Label>
                    <Select value={bumpProductType} onValueChange={(v) => { setBumpProductType(v as ProductType); setBumpProductId(''); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="course">Curso</SelectItem>
                        <SelectItem value="ebook">Ebook</SelectItem>
                        <SelectItem value="event">Evento</SelectItem>
                        <SelectItem value="community">Comunidad</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Producto</Label>
                    <Select value={bumpProductId} onValueChange={setBumpProductId}>
                      <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                      <SelectContent>
                        {(products?.[bumpProductType] ?? []).map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Descuento (%)</Label>
                  <Input type="number" min={0} max={90} value={bumpDiscountPct} onChange={(e) => setBumpDiscountPct(Number(e.target.value))} />
                </div>
                <div>
                  <Label>Titular del bump</Label>
                  <Input value={bumpHeadline} onChange={(e) => setBumpHeadline(e.target.value)} />
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Textarea value={bumpDescription} onChange={(e) => setBumpDescription(e.target.value)} rows={3} />
                </div>
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BlockPropertyEditor({ block, onChange }: { block: CheckoutBlock; onChange: (d: Record<string, any>) => void }) {
  const d = block.data;
  switch (block.type) {
    case 'hero':
      return (
        <>
          <Input placeholder="Título" value={d.title ?? ''} onChange={(e) => onChange({ title: e.target.value })} />
          <Textarea placeholder="Subtítulo" value={d.subtitle ?? ''} onChange={(e) => onChange({ subtitle: e.target.value })} rows={2} />
          <Input placeholder="URL de imagen" value={d.imageUrl ?? ''} onChange={(e) => onChange({ imageUrl: e.target.value })} />
        </>
      );
    case 'video':
      return <Input placeholder="URL YouTube" value={d.url ?? ''} onChange={(e) => onChange({ url: e.target.value })} />;
    case 'benefits':
      return (
        <>
          <Input placeholder="Título" value={d.title ?? ''} onChange={(e) => onChange({ title: e.target.value })} />
          <Textarea
            placeholder="Un beneficio por línea"
            value={(d.items ?? []).join('\n')}
            onChange={(e) => onChange({ items: e.target.value.split('\n').filter(Boolean) })}
            rows={6}
          />
        </>
      );
    case 'testimonials':
      return (
        <>
          <Input placeholder="Título" value={d.title ?? ''} onChange={(e) => onChange({ title: e.target.value })} />
          <Textarea
            placeholder='JSON: [{"name":"...","text":"...","rating":5}]'
            value={JSON.stringify(d.items ?? [], null, 2)}
            onChange={(e) => { try { onChange({ items: JSON.parse(e.target.value) }); } catch {} }}
            rows={8}
          />
        </>
      );
    case 'guarantee':
      return (
        <>
          <Input placeholder="Título" value={d.title ?? ''} onChange={(e) => onChange({ title: e.target.value })} />
          <Textarea placeholder="Texto" value={d.text ?? ''} onChange={(e) => onChange({ text: e.target.value })} rows={3} />
        </>
      );
    case 'faq':
      return (
        <>
          <Input placeholder="Título" value={d.title ?? ''} onChange={(e) => onChange({ title: e.target.value })} />
          <Textarea
            placeholder='JSON: [{"q":"...","a":"..."}]'
            value={JSON.stringify(d.items ?? [], null, 2)}
            onChange={(e) => { try { onChange({ items: JSON.parse(e.target.value) }); } catch {} }}
            rows={8}
          />
        </>
      );
    case 'countdown':
      return (
        <>
          <Input placeholder="Título" value={d.title ?? ''} onChange={(e) => onChange({ title: e.target.value })} />
          <Input type="datetime-local" value={d.endsAt ?? ''} onChange={(e) => onChange({ endsAt: e.target.value })} />
        </>
      );
    case 'checkout_button':
      return <Input placeholder="Texto del botón" value={d.label ?? ''} onChange={(e) => onChange({ label: e.target.value })} />;
    default:
      return <p className="text-xs text-muted-foreground">Este bloque no tiene opciones editables.</p>;
  }
}
