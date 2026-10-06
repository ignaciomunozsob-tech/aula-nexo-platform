import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Eye, BookOpen, FileText, Calendar, Video, Ticket } from 'lucide-react';
import { formatPrice, getCourseUrl } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewProductDialog } from '@/components/creator/NewProductDialog';

interface ProductCardProps {
  title: string;
  status: string;
  price: number;
  imageUrl?: string | null;
  editUrl: string;
  publicUrl?: string;
  typeLabel: string;
  icon: ReactNode;
  meta?: string;
}

const statusLabels: Record<string, string> = {
  published: 'Publicado',
  hidden: 'Oculto',
  draft: 'Borrador',
};

function ProductCard({ title, status, price, imageUrl, editUrl, publicUrl, typeLabel, icon, meta }: ProductCardProps) {
  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative aspect-video overflow-hidden bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt={`Portada de ${title}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-5 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-muted-foreground">{icon}</div>
            <span className="line-clamp-2 text-base font-semibold text-foreground">{title}</span>
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm">
          {typeLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-2 text-base font-semibold text-foreground">{title}</h2>
        {meta && <p className="mt-1 text-sm text-muted-foreground">{meta}</p>}

        <div className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-3">
          <div>
            <p className="text-xs text-muted-foreground">Estado</p>
            <span className={status === 'published' ? 'badge-published' : 'badge-draft'}>
              {statusLabels[status] || status}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Precio</p>
            <p className="mt-1 font-semibold text-foreground">{price === 0 ? 'Gratis' : formatPrice(price)}</p>
          </div>
        </div>

        <div className="mt-auto flex gap-2 pt-4">
          <Button asChild className="min-w-0 flex-1">
            <Link to={editUrl}><Edit className="mr-2 h-4 w-4" />Editar</Link>
          </Button>
          {publicUrl && (
            <Button variant="outline" size="icon" asChild title="Ver página pública">
              <Link to={publicUrl} target="_blank" aria-label={`Ver página pública de ${title}`}><Eye className="h-4 w-4" /></Link>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductGrid({ loading, children, emptyLabel, onCreate }: { loading: boolean; children: ReactNode; emptyLabel: string; onCreate: () => void }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="aspect-[4/3] animate-pulse rounded-lg border border-border bg-muted" />)}
      </div>
    );
  }

  if (!children) {
    return (
      <div className="rounded-lg border border-border bg-card py-12 text-center">
        <p className="mb-4 text-muted-foreground">No tienes {emptyLabel} aún</p>
        <Button onClick={onCreate}>Crear mi primer producto</Button>
      </div>
    );
  }

  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

export default function CreatorProductsPage() {
  const { user, profile } = useAuth();
  const [newProductOpen, setNewProductOpen] = useState(false);

  const { data: courses, isLoading: loadingCourses } = useQuery({
    // Keep this cache separate from dashboard/course lists that request fewer columns.
    queryKey: ['creator-products-courses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, status, price_clp, cover_image_url, slug, created_at')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: ebooks, isLoading: loadingEbooks } = useQuery({
    queryKey: ['creator-ebooks', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('ebooks').select('id, title, price_clp, status, cover_image_url, slug, created_at').eq('creator_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['creator-events', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('events').select('id, title, price_clp, status, cover_image_url, event_date, slug').eq('creator_id', user.id).order('event_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['creator-sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from('one_on_one_sessions').select('*').eq('creator_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const hasPublicStatus = (status: string) => ['published', 'hidden'].includes(status);
  const creatorSlug = profile?.creator_slug;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mis Productos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Administra y edita todo lo que vendes en NOVU.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" asChild className="w-full sm:w-auto"><Link to="/creator-app/coupons"><Ticket className="mr-2 h-4 w-4" />Cupones</Link></Button>
          <Button onClick={() => setNewProductOpen(true)} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />Nuevo Producto</Button>
        </div>
      </div>

      <Tabs defaultValue="courses" className="space-y-6">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="h-auto w-max justify-start">
            <TabsTrigger value="courses" className="gap-2"><BookOpen className="h-4 w-4" />Cursos ({courses?.length || 0})</TabsTrigger>
            <TabsTrigger value="ebooks" className="gap-2"><FileText className="h-4 w-4" />E-books ({ebooks?.length || 0})</TabsTrigger>
            <TabsTrigger value="events" className="gap-2"><Calendar className="h-4 w-4" />Eventos ({events?.length || 0})</TabsTrigger>
            <TabsTrigger value="sessions" className="gap-2"><Video className="h-4 w-4" />Servicios ({sessions?.length || 0})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="courses">
          <ProductGrid loading={loadingCourses} emptyLabel="cursos" onCreate={() => setNewProductOpen(true)}>
            {courses?.length ? courses.map((course) => (
              <ProductCard key={course.id} title={course.title} status={course.status} price={course.price_clp} imageUrl={course.cover_image_url} typeLabel="Curso" icon={<BookOpen className="h-5 w-5" />} editUrl={`/creator-app/courses/${course.id}/edit`} publicUrl={hasPublicStatus(course.status) ? getCourseUrl(creatorSlug, course.slug, course.id) : undefined} />
            )) : null}
          </ProductGrid>
        </TabsContent>

        <TabsContent value="ebooks">
          <ProductGrid loading={loadingEbooks} emptyLabel="e-books" onCreate={() => setNewProductOpen(true)}>
            {ebooks?.length ? ebooks.map((ebook) => (
              <ProductCard key={ebook.id} title={ebook.title} status={ebook.status} price={ebook.price_clp} imageUrl={ebook.cover_image_url} typeLabel="E-book" icon={<FileText className="h-5 w-5" />} editUrl={`/creator-app/ebooks/${ebook.id}/edit`} publicUrl={hasPublicStatus(ebook.status) && creatorSlug ? `/${creatorSlug}/${ebook.slug}` : undefined} />
            )) : null}
          </ProductGrid>
        </TabsContent>

        <TabsContent value="events">
          <ProductGrid loading={loadingEvents} emptyLabel="eventos" onCreate={() => setNewProductOpen(true)}>
            {events?.length ? events.map((event) => (
              <ProductCard key={event.id} title={event.title} status={event.status} price={event.price_clp} imageUrl={event.cover_image_url} typeLabel="Evento" icon={<Calendar className="h-5 w-5" />} editUrl={`/creator-app/events/${event.id}/edit`} publicUrl={hasPublicStatus(event.status) && creatorSlug ? `/${creatorSlug}/${event.slug}` : undefined} meta={new Date(event.event_date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })} />
            )) : null}
          </ProductGrid>
        </TabsContent>

        <TabsContent value="sessions">
          <ProductGrid loading={loadingSessions} emptyLabel="servicios" onCreate={() => setNewProductOpen(true)}>
            {sessions?.length ? sessions.map((session) => (
              <ProductCard key={session.id} title={session.title} status={session.status} price={session.price_clp} imageUrl={session.cover_url} typeLabel="Servicio 1:1" icon={<Video className="h-5 w-5" />} editUrl={`/creator-app/sessions/${session.id}/edit`} publicUrl={hasPublicStatus(session.status) && creatorSlug ? (session.slug ? `/${creatorSlug}/${session.slug}` : `/c/${creatorSlug}/sesion/${session.id}`) : undefined} meta={`${session.duration_min} min`} />
            )) : null}
          </ProductGrid>
        </TabsContent>
      </Tabs>

      <NewProductDialog open={newProductOpen} onOpenChange={setNewProductOpen} />
    </div>
  );
}
