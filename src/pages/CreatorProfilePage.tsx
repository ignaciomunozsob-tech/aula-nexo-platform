import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePageView } from '@/hooks/usePageView';
import { User, Star, Instagram, Linkedin, Globe, Youtube, Twitter, Play, ChevronDown, Clock, Calendar, Video, BookOpen, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SEO } from '@/components/SEO';
import { CreatorProfileSkeleton } from '@/components/ui/page-skeletons';
import { formatPrice } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize';

const socialIcons: Record<string, any> = { instagram: Instagram, linkedin: Linkedin, twitter: Twitter, youtube: Youtube, website: Globe };
const defaultOrder = ['course', 'event', 'ebook', 'session'];
const labels: Record<string, string> = { course: 'Cursos', event: 'Eventos', ebook: 'E-books', session: 'Servicios 1:1' };

function StarRating({ value }: { value: number }) {
  return <div className="flex gap-1">{[1, 2, 3, 4, 5].map((star) => <Star key={star} className={`h-5 w-5 ${star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />)}</div>;
}

function ProductCard({ type, product, creator }: { type: string; product: any; creator: any }) {
  const href = type === 'course' ? `/${creator.creator_slug}/${product.slug}` : type === 'event' ? `/${creator.creator_slug}/${product.slug}` : type === 'ebook' ? `/${creator.creator_slug}/${product.slug}` : `/${creator.creator_slug}/${product.slug}`;
  const title = product.title;
  const image = product.cover_image_url || product.cover_url;
  const icon = type === 'course' ? <BookOpen className="h-10 w-10 text-muted-foreground" /> : type === 'ebook' ? <FileText className="h-10 w-10 text-muted-foreground" /> : type === 'event' ? <Calendar className="h-10 w-10 text-muted-foreground" /> : <Video className="h-10 w-10 text-muted-foreground" />;
  const detail = type === 'session' ? `${product.duration_min} min · Agenda online` : type === 'event' ? new Date(product.event_date).toLocaleDateString('es-CL') : type === 'course' && product.level ? product.level : '';
  return <Link to={href} className="group bg-card rounded-lg border border-border overflow-hidden flex flex-col hover:border-primary transition-colors">
    <div className="aspect-video bg-muted relative overflow-hidden">{image ? <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center">{icon}</div>}</div>
    <div className="p-4 flex flex-col flex-1"><p className="text-xs text-primary font-medium mb-1">{labels[type]}</p><h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>{product.description && <div className="text-sm text-muted-foreground mt-2 line-clamp-2" dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }} />}<div className="mt-auto pt-4 flex items-center justify-between border-t border-border/50"><span className="text-sm text-muted-foreground flex items-center gap-1">{detail && (type === 'session' ? <Clock className="h-3.5 w-3.5" /> : null)}{detail}</span><span className="font-semibold">{product.price_clp === 0 ? 'Gratis' : formatPrice(product.price_clp)}</span></div></div>
  </Link>;
}

export default function CreatorProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [visibleReviews, setVisibleReviews] = useState(3);
  const { data: creator, isLoading } = useQuery({ queryKey: ['creator', slug], queryFn: async () => { const { data, error } = await supabase.rpc('get_public_creator_profile', { _slug: slug ?? '' }); if (error) throw error; return data?.[0] ?? null; } });
  usePageView('creator_profile', creator?.id);
  useEffect(() => { if (!slug) return; supabase.rpc('get_creator_pixel_id', { _creator_slug: slug }).then(({ data }) => { if (data) { const id = data as string; import('@/lib/metaPixel').then(({ initPixel, trackEventFor }) => { initPixel(id); trackEventFor(id, 'PageView'); }); } }); }, [slug]);

  const { data: products } = useQuery({ queryKey: ['creator-public-products', creator?.id], queryFn: async () => {
    const [courses, events, ebooks, sessions] = await Promise.all([
      supabase.from('courses').select('*').eq('creator_id', creator!.id).eq('status', 'published').order('created_at', { ascending: false }),
      supabase.from('events').select('*').eq('creator_id', creator!.id).eq('status', 'published').order('event_date', { ascending: true }),
      supabase.from('ebooks').select('*').eq('creator_id', creator!.id).eq('status', 'published').order('created_at', { ascending: false }),
      supabase.from('one_on_one_sessions').select('*').eq('creator_id', creator!.id).eq('status', 'published').order('created_at', { ascending: false }),
    ]);
    for (const result of [courses, events, ebooks, sessions]) if (result.error) throw result.error;
    return { course: courses.data ?? [], event: events.data ?? [], ebook: ebooks.data ?? [], session: sessions.data ?? [] };
  }, enabled: !!creator?.id });
  const { data: reviews = [] } = useQuery({ queryKey: ['creator-reviews', creator?.id], queryFn: async () => { const { data, error } = await supabase.rpc('get_creator_reviews', { _creator_id: creator!.id }); if (error) throw error; return data ?? []; }, enabled: !!creator?.id });

  const orderedTypes = useMemo(() => { const requested = Array.isArray((creator as any)?.public_product_order) ? (creator as any).public_product_order.filter((type: any) => defaultOrder.includes(type)) : []; return [...requested, ...defaultOrder.filter((type) => !requested.includes(type))]; }, [creator]);
  if (isLoading) return <CreatorProfileSkeleton />;
  if (!creator) return <div className="page-container text-center py-20"><h1 className="text-2xl font-bold mb-4">Creador no encontrado</h1><Button asChild><Link to="/courses">Ver cursos</Link></Button></div>;
  const links: any[] = Array.isArray((creator as any).links) ? (creator as any).links : [];
  const avgRating = reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : null;
  const shownReviews = reviews.slice(0, visibleReviews);

  return <div className="page-container"><SEO title={`${creator.name || 'Creador'} — NOVU`} description={creator.bio?.trim() || `Cursos y productos digitales de ${creator.name || 'este creador'} en NOVU.`} path={`/creator/${creator.creator_slug || slug}`} type="profile" image={creator.avatar_url || undefined} />
    <div className="bg-primary/10 rounded-2xl p-8 mb-12"><div className="grid grid-cols-1 lg:grid-cols-2 gap-8"><div className="flex flex-col md:flex-row items-center md:items-start gap-6"><div className="w-24 h-24 rounded-full bg-background flex items-center justify-center overflow-hidden shrink-0">{creator.avatar_url ? <img src={creator.avatar_url} alt={creator.name || 'Creador'} className="w-full h-full object-cover" /> : <User className="h-12 w-12 text-primary" />}</div><div className="text-center md:text-left flex-1"><h1 className="text-2xl font-bold">{creator.name}</h1><p className="text-primary font-medium mt-1">Creador en NOVU</p>{avgRating && <div className="flex items-center gap-2 mt-2 justify-center md:justify-start"><Star className="h-5 w-5 fill-yellow-400 text-yellow-400" /><span className="font-semibold">{avgRating}</span><span className="text-muted-foreground text-sm">({reviews.length} evaluaciones)</span></div>}{creator.bio && <p className="text-muted-foreground mt-3 text-sm">{creator.bio}</p>}{links.length > 0 && <div className="flex flex-wrap gap-2 mt-4 justify-center md:justify-start">{links.map((link: any, index: number) => { const Icon = socialIcons[link.type] || Globe; return <a key={index} href={link.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background border rounded-full text-sm hover:border-primary transition-colors"><Icon className="h-4 w-4" />{link.label}</a>; })}</div>}</div></div>{(creator as any).intro_video_url && <div className="flex flex-col"><h3 className="text-sm font-medium mb-2 flex items-center gap-2"><Play className="h-4 w-4" />Conóceme</h3><div className="aspect-video rounded-xl overflow-hidden bg-muted"><iframe src={(creator as any).intro_video_url} title={`Video de presentación de ${creator.name}`} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></div>}</div></div>
    {orderedTypes.map((type) => products?.[type as keyof typeof products]?.length ? <section key={type} className="mb-12"><h2 className="text-2xl font-bold mb-6">{labels[type]}</h2><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{products[type as keyof typeof products].map((product: any) => <ProductCard key={product.id} type={type} product={product} creator={creator} />)}</div></section> : null)}
    <section><h2 className="text-2xl font-bold mb-6">Evaluaciones</h2>{shownReviews.length ? <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{shownReviews.map((review: any) => <Card key={review.id}><CardContent className="pt-6"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">{review.reviewer_avatar_url ? <img src={review.reviewer_avatar_url} alt="" className="w-full h-full object-cover rounded-full" /> : <User className="h-5 w-5 text-muted-foreground" />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="font-medium truncate">{review.reviewer_name || 'Usuario'}</p><span className="text-xs text-muted-foreground shrink-0">{new Date(review.created_at).toLocaleDateString('es-CL')}</span></div><StarRating value={review.rating} />{review.product_title && <p className="text-xs text-muted-foreground mt-2">{labels[review.product_type] || 'Producto'} · {review.product_title}</p>}{review.comment && <p className="text-muted-foreground mt-2">{review.comment}</p>}<p className="text-xs text-primary mt-3">Comprador verificado por NOVU</p></div></div></CardContent></Card>)}</div> : <p className="text-muted-foreground">Aún no hay evaluaciones para este creador.</p>}{visibleReviews < reviews.length && <div className="flex justify-center mt-6"><Button variant="outline" onClick={() => setVisibleReviews((count) => count + 3)}>Cargar más evaluaciones <ChevronDown className="h-4 w-4 ml-2" /></Button></div>}</section>
  </div>;
}
