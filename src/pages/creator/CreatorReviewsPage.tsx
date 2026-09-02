import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Mail, MessageSquare, Send, Star, User } from 'lucide-react';
import { DashboardSkeleton } from '@/components/ui/page-skeletons';
import { useToast } from '@/hooks/use-toast';

const PRODUCT_LABELS: Record<string, string> = { course: 'Curso', ebook: 'E-book', event: 'Evento', session: 'Agendamiento', community: 'Comunidad' };

function StarRating({ value }: { value: number }) {
  return <div className="flex gap-0.5">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-4 w-4 ${star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />)}</div>;
}

export default function CreatorReviewsPage({ defaultProduct, embedded }: { defaultProduct?: { type: string; id: string }; embedded?: boolean } = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState(defaultProduct ? `${defaultProduct.type}:${defaultProduct.id}` : '');

  const { data, isLoading } = useQuery({
    queryKey: ['creator-all-reviews', user?.id],
    queryFn: async () => {
      const { data: reviews, error } = await supabase.from('creator_reviews').select('*').eq('creator_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      const total = reviews?.length || 0;
      const avgRating = total ? reviews.reduce((sum, review) => sum + review.rating, 0) / total : 0;
      const distribution = [0, 0, 0, 0, 0];
      reviews?.forEach((review) => { if (review.rating >= 1 && review.rating <= 5) distribution[review.rating - 1]++; });
      return { reviews: reviews ?? [], total, avgRating, distribution };
    },
    enabled: !!user?.id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['creator-review-products', user?.id],
    queryFn: async () => {
      const [courses, ebooks, events, sessions, communities] = await Promise.all([
        supabase.from('courses').select('id,title').eq('creator_id', user!.id).order('title'),
        supabase.from('ebooks').select('id,title').eq('creator_id', user!.id).order('title'),
        supabase.from('events').select('id,title').eq('creator_id', user!.id).order('title'),
        supabase.from('one_on_one_sessions').select('id,title').eq('creator_id', user!.id).order('title'),
        supabase.from('communities').select('id,name').eq('creator_id', user!.id).order('name'),
      ]);
      return [
        ...(courses.data ?? []).map((item) => ({ ...item, product_type: 'course', title: item.title })),
        ...(ebooks.data ?? []).map((item) => ({ ...item, product_type: 'ebook', title: item.title })),
        ...(events.data ?? []).map((item) => ({ ...item, product_type: 'event', title: item.title })),
        ...(sessions.data ?? []).map((item) => ({ ...item, product_type: 'session', title: item.title })),
        ...(communities.data ?? []).map((item) => ({ ...item, product_type: 'community', title: item.name })),
      ];
    },
    enabled: !!user?.id,
  });

  const requestMutation = useMutation({
    mutationFn: async () => {
      const product = products.find((item) => `${item.product_type}:${item.id}` === selectedProduct);
      if (!product) throw new Error('Selecciona un producto');
      const { data: result, error } = await supabase.functions.invoke('request-reviews', { body: { product_type: product.product_type, product_id: product.id } });
      if (error) throw error;
      return result as { sent: number; skipped: number; total: number; message?: string };
    },
    onSuccess: (result) => {
      toast({ title: result.sent ? 'Solicitudes enviadas' : 'No hay compradores disponibles', description: result.message ?? `Se enviaron ${result.sent} correos a compradores verificados.` });
      queryClient.invalidateQueries({ queryKey: ['creator-all-reviews', user?.id] });
    },
    onError: (error: Error) => toast({ title: 'No pudimos enviar las solicitudes', description: error.message, variant: 'destructive' }),
  });

  const selectedProductLabel = useMemo(() => products.find((item) => `${item.product_type}:${item.id}` === selectedProduct)?.title, [products, selectedProduct]);

  const visibleReviews = useMemo(() => {
    const all = data?.reviews ?? [];
    return defaultProduct ? all.filter((r) => r.product_type === defaultProduct.type && r.product_id === defaultProduct.id) : all;
  }, [data, defaultProduct]);

  const stats = useMemo(() => {
    const total = visibleReviews.length;
    const avgRating = total ? visibleReviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    const distribution = [0, 0, 0, 0, 0];
    visibleReviews.forEach((r) => { if (r.rating >= 1 && r.rating <= 5) distribution[r.rating - 1]++; });
    return { total, avgRating, distribution };
  }, [visibleReviews]);

  if (isLoading) return <DashboardSkeleton />;

  return <div className={embedded ? 'space-y-8' : 'p-4 sm:p-6 lg:p-8 space-y-8'}>
    {!embedded && <div><h1 className="text-2xl font-bold">Evaluaciones</h1><p className="text-muted-foreground mt-1">Solicita opiniones a quienes compraron tus productos y servicios.</p></div>}

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" />Solicitar evaluaciones</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Enviaremos un correo a los compradores verificados del producto seleccionado. Cada persona recibirá un enlace personal y podrá responder sin iniciar sesión.</p>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-2"><Label>Producto o servicio</Label><Select value={selectedProduct} onValueChange={setSelectedProduct}><SelectTrigger><SelectValue placeholder="Selecciona un producto" /></SelectTrigger><SelectContent>{products.map((product) => <SelectItem key={`${product.product_type}:${product.id}`} value={`${product.product_type}:${product.id}`}>{PRODUCT_LABELS[product.product_type]} · {product.title}</SelectItem>)}</SelectContent></Select></div>
          <Button onClick={() => requestMutation.mutate()} disabled={!selectedProduct || requestMutation.isPending}><Send className="h-4 w-4 mr-2" />{requestMutation.isPending ? 'Enviando...' : 'Solicitar evaluaciones'}</Button>
        </div>
        {selectedProductLabel && <p className="text-xs text-muted-foreground">Producto seleccionado: {selectedProductLabel}</p>}
      </CardContent>
    </Card>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Promedio</CardTitle><Star className="h-4 w-4 text-yellow-400" /></CardHeader><CardContent><div className="text-3xl font-bold flex items-center gap-2">{stats.avgRating.toFixed(1)}<Star className="h-6 w-6 fill-yellow-400 text-yellow-400" /></div></CardContent></Card>
      <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total evaluaciones</CardTitle><MessageSquare className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-3xl font-bold">{stats.total}</div></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Distribución</CardTitle></CardHeader><CardContent><div className="space-y-1">{[5, 4, 3, 2, 1].map((stars) => { const count = stats.distribution[stars - 1] || 0; const percentage = stats.total ? count / stats.total * 100 : 0; return <div key={stars} className="flex items-center gap-2 text-sm"><span className="w-3">{stars}</span><Star className="h-3 w-3 fill-yellow-400 text-yellow-400" /><div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-yellow-400" style={{ width: `${percentage}%` }} /></div><span className="w-8 text-muted-foreground">{count}</span></div>; })}</div></CardContent></Card>
    </div>

    <Card><CardHeader><CardTitle>{defaultProduct ? 'Evaluaciones de este producto' : 'Todas las evaluaciones'}</CardTitle></CardHeader><CardContent>{(defaultProduct ? (data?.reviews ?? []).filter((r) => r.product_type === defaultProduct.type && r.product_id === defaultProduct.id) : (data?.reviews ?? [])).length ? <div className="space-y-6">{(defaultProduct ? (data?.reviews ?? []).filter((r) => r.product_type === defaultProduct.type && r.product_id === defaultProduct.id) : (data?.reviews ?? [])).map((review) => <div key={review.id} className="flex items-start gap-4 pb-6 border-b last:border-0 last:pb-0"><div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0"><User className="h-5 w-5 text-muted-foreground" /></div><div className="flex-1 min-w-0"><div className="flex items-center justify-between gap-4"><p className="font-medium truncate">{review.is_anonymous ? 'Anónimo' : review.reviewer_name || 'Usuario'}</p><span className="text-sm text-muted-foreground shrink-0">{new Date(review.created_at).toLocaleDateString('es-CL')}</span></div><StarRating value={review.rating} />{review.product_title && <p className="text-xs text-muted-foreground mt-1">{PRODUCT_LABELS[review.product_type ?? ''] ?? 'Producto'} · {review.product_title}</p>}{review.comment && <p className="text-muted-foreground mt-2">{review.comment}</p>}<p className="text-xs text-primary mt-2">Comprador verificado por NOVU</p></div></div>)}</div> : <p className="text-center text-muted-foreground py-8">Aún no tienes evaluaciones. Solicítalas a los compradores de tus productos.</p>}</CardContent></Card>
  </div>;
}
