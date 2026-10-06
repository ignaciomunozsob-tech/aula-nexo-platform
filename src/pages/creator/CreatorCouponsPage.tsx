import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Edit, Trash2, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { formatPrice } from '@/lib/utils';

type ProductRef = { type: 'course' | 'event' | 'ebook'; id: string };
type Coupon = {
  id: string; code: string; discount_type: 'percent' | 'fixed'; discount_value: number;
  products: ProductRef[]; expires_at: string | null; max_uses: number | null; is_active: boolean;
};

const TYPE_LABEL: Record<string, string> = { course: 'Curso', event: 'Evento', ebook: 'E-book' };

const empty = {
  id: null as string | null, code: '', discount_type: 'percent' as 'percent' | 'fixed', discount_value: '',
  products: [] as ProductRef[], expires_at: '', max_uses: '', is_active: true,
};

export default function CreatorCouponsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<typeof empty | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ['creator-coupons', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('coupons').select('*').eq('creator_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const { data: usage } = useQuery({
    queryKey: ['creator-coupon-usage', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any).rpc('coupon_usage_counts');
      const map: Record<string, number> = {};
      for (const r of data || []) map[r.coupon_id] = r.uses;
      return map;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['creator-coupon-products', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [c, e, b] = await Promise.all([
        supabase.from('courses').select('id, title').eq('creator_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('events').select('id, title').eq('creator_id', user!.id).order('created_at', { ascending: false }),
        supabase.from('ebooks').select('id, title').eq('creator_id', user!.id).order('created_at', { ascending: false }),
      ]);
      return [
        ...(c.data || []).map((p) => ({ type: 'course' as const, id: p.id, title: p.title })),
        ...(e.data || []).map((p) => ({ type: 'event' as const, id: p.id, title: p.title })),
        ...(b.data || []).map((p) => ({ type: 'ebook' as const, id: p.id, title: p.title })),
      ];
    },
  });

  const titleOf = (r: ProductRef) => products?.find((p) => p.id === r.id)?.title ?? 'Producto';

  const openEdit = (c: Coupon) => setForm({
    id: c.id, code: c.code, discount_type: c.discount_type, discount_value: String(c.discount_value),
    products: c.products || [], expires_at: c.expires_at ? c.expires_at.slice(0, 16) : '',
    max_uses: c.max_uses ? String(c.max_uses) : '', is_active: c.is_active,
  });

  const toggleProduct = (p: ProductRef) => {
    if (!form) return;
    const has = form.products.some((x) => x.id === p.id);
    setForm({ ...form, products: has ? form.products.filter((x) => x.id !== p.id) : [...form.products, { type: p.type, id: p.id }] });
  };

  const save = async () => {
    if (!form || !user) return;
    const code = form.code.trim().toUpperCase();
    const value = Math.round(Number(form.discount_value));
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) return toast.error('El código debe tener 3 a 30 caracteres (letras, números, - o _)');
    if (!value || value <= 0) return toast.error('Ingresa el valor del descuento');
    if (form.discount_type === 'percent' && value > 100) return toast.error('El porcentaje no puede superar 100%');
    if (!form.products.length) return toast.error('Elige al menos un producto');
    const maxUses = form.max_uses ? Math.round(Number(form.max_uses)) : null;
    if (maxUses !== null && maxUses <= 0) return toast.error('Cantidad de usos inválida');
    const payload = {
      creator_id: user.id, code, discount_type: form.discount_type, discount_value: value,
      products: form.products, expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      max_uses: maxUses, is_active: form.is_active,
    };
    setSaving(true);
    const q = form.id
      ? (supabase as any).from('coupons').update(payload).eq('id', form.id)
      : (supabase as any).from('coupons').insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) {
      toast.error(error.code === '23505' ? 'Ya tienes un cupón con ese código' : error.message);
      return;
    }
    toast.success('Cupón guardado');
    setForm(null);
    qc.invalidateQueries({ queryKey: ['creator-coupons'] });
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`¿Eliminar el cupón ${c.code}?`)) return;
    const { error } = await (supabase as any).from('coupons').delete().eq('id', c.id);
    if (error) return toast.error(error.message);
    toast.success('Cupón eliminado');
    qc.invalidateQueries({ queryKey: ['creator-coupons'] });
  };

  const statusOf = (c: Coupon) => {
    if (!c.is_active) return { label: 'Inactivo', variant: 'secondary' as const };
    if (c.expires_at && new Date(c.expires_at) < new Date()) return { label: 'Vencido', variant: 'secondary' as const };
    if (c.max_uses && (usage?.[c.id] ?? 0) >= c.max_uses) return { label: 'Agotado', variant: 'secondary' as const };
    return { label: 'Activo', variant: 'default' as const };
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <Link to="/creator-app/products" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver a Productos
      </Link>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cupones de descuento</h1>
          <p className="text-sm text-muted-foreground">Crea códigos para tus cursos, eventos y e-books. Funcionan al comprar y en tus páginas de pago con cupones activados.</p>
        </div>
        <Button onClick={() => setForm({ ...empty })} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Nuevo cupón</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando...</p>
      ) : !coupons?.length ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Ticket className="h-10 w-10 mx-auto mb-3" />
          Aún no tienes cupones.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {coupons.map((c) => {
            const st = statusOf(c);
            return (
              <Card key={c.id} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-lg">{c.code}</span>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>
                <p className="text-sm font-semibold">
                  {c.discount_type === 'percent' ? `${c.discount_value}% de descuento` : `${formatPrice(c.discount_value)} de descuento`}
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Usos: {usage?.[c.id] ?? 0}{c.max_uses ? ` / ${c.max_uses}` : ''}</p>
                  {c.expires_at && <p>Vence: {new Date(c.expires_at).toLocaleString('es-CL')}</p>}
                  <p className="line-clamp-2">Aplica a: {(c.products || []).map(titleOf).join(', ')}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}><Edit className="h-4 w-4 mr-1" />Editar</Button>
                  <Button variant="outline" size="sm" onClick={() => remove(c)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.id ? 'Editar cupón' : 'Nuevo cupón'}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="VERANO20" maxLength={30} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Porcentaje (%)</SelectItem>
                      <SelectItem value="fixed">Monto fijo (CLP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{form.discount_type === 'percent' ? 'Porcentaje' : 'Monto CLP'}</Label>
                  <Input type="number" min={1} value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Vence (opcional)</Label>
                  <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Máximo de usos (opcional)</Label>
                  <Input type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Sin límite" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Productos donde aplica</Label>
                <div className="max-h-56 overflow-y-auto rounded-md border p-2 space-y-1">
                  {!products?.length && <p className="text-xs text-muted-foreground p-2">No tienes cursos, eventos ni e-books.</p>}
                  {products?.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 rounded p-1.5 hover:bg-muted cursor-pointer text-sm">
                      <Checkbox checked={form.products.some((x) => x.id === p.id)} onCheckedChange={() => toggleProduct(p)} />
                      <span className="flex-1 truncate">{p.title}</span>
                      <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[p.type]}</Badge>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} id="c-active" />
                <Label htmlFor="c-active">Cupón activo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={save} disabled={saving} className="w-full sm:w-auto">{saving ? 'Guardando...' : 'Guardar cupón'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
