import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import {
  BookOpen,
  ShoppingBag,
  Calendar,
  LogOut,
  FileText,
  CalendarDays,
  Download,
  Loader2,
  ArrowUpRight,
  Receipt,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SEO } from '@/components/SEO';
import { toast } from 'sonner';
import {
  useMyEbooks,
  useMySessionBookings,
  useMyPaidOrders,
  getEbookDownloadUrl,
} from '@/hooks/useStudentLibrary';
import { MyPurchasesTable } from '@/components/student/MyPurchasesTable';

type Kind = 'course' | 'event' | 'ebook' | 'session';

type Item = {
  key: string;
  kind: Kind;
  title: string;
  cover: string | null;
  subtitle: string;
  to?: string;
  ebookId?: string;
  meetUrl?: string | null;
  date: number;
};

const KIND_META: Record<Kind, { label: string; icon: typeof BookOpen }> = {
  course: { label: 'Curso online', icon: BookOpen },
  event: { label: 'Evento', icon: Calendar },
  ebook: { label: 'E-book', icon: FileText },
  session: { label: 'Sesión 1:1', icon: CalendarDays },
};

export default function MyCoursesPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const { data: enrollments, isLoading: loadingCourses } = useQuery({
    queryKey: ['my-enrollments-all', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, purchased_at, courses ( id, title, slug, cover_image_url )')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('purchased_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: eventRegistrations, isLoading: loadingEvents } = useQuery({
    queryKey: ['my-events', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('event_registrations')
        .select('id, registered_at, events ( id, title, slug, cover_image_url, event_date, event_type )')
        .eq('user_id', user.id)
        .eq('status', 'registered')
        .order('registered_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: ebooks, isLoading: loadingEbooks } = useMyEbooks();
  const { data: bookings, isLoading: loadingSessions } = useMySessionBookings();
  const { data: paidOrders, isLoading: loadingOrders } = useMyPaidOrders();

  const isLoading =
    loadingCourses || loadingEvents || loadingEbooks || loadingSessions || loadingOrders;

  const items: Item[] = [];

  for (const e of enrollments || []) {
    const c = (e as any).courses;
    if (!c) continue;
    items.push({
      key: `course-${c.id}`,
      kind: 'course',
      title: c.title,
      cover: c.cover_image_url,
      subtitle: 'Acceso disponible',
      to: `/app/course/${c.id}`,
      date: new Date((e as any).purchased_at || 0).getTime(),
    });
  }

  for (const r of eventRegistrations || []) {
    const ev = (r as any).events;
    if (!ev) continue;
    const past = new Date(ev.event_date).getTime() < Date.now();
    items.push({
      key: `event-${(r as any).id}`,
      kind: 'event',
      title: ev.title,
      cover: ev.cover_image_url,
      subtitle: past
        ? 'Finalizado'
        : new Date(ev.event_date).toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Santiago',
          }),
      to: `/app/event/${ev.id}`,
      date: new Date((r as any).registered_at || 0).getTime(),
    });
  }

  for (const e of ebooks || []) {
    items.push({
      key: `ebook-${e.ebook_id}`,
      kind: 'ebook',
      title: e.title,
      cover: e.cover_image_url,
      subtitle: 'Listo para descargar',
      ebookId: e.ebook_id,
      date: new Date(e.purchased_at || 0).getTime(),
    });
  }

  for (const b of bookings || []) {
    const past = new Date(b.end_at).getTime() < Date.now();
    items.push({
      key: `session-${b.id}`,
      kind: 'session',
      title: b.session_title,
      cover: null,
      subtitle:
        b.status === 'cancelled'
          ? 'Cancelada'
          : past
          ? 'Realizada'
          : new Date(b.start_at).toLocaleDateString('es-CL', {
              day: 'numeric',
              month: 'long',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Santiago',
            }),
      meetUrl: b.meet_url,
      date: new Date(b.start_at || 0).getTime(),
    });
  }

  items.sort((a, b) => b.date - a.date);

  const purchaseTitles: Record<string, string> = {};
  enrollments?.forEach((e) => {
    const c = (e as any).courses;
    if (c) purchaseTitles[c.id] = c.title;
  });
  eventRegistrations?.forEach((r) => {
    const ev = (r as any).events;
    if (ev) purchaseTitles[ev.id] = ev.title;
  });
  ebooks?.forEach((e) => {
    purchaseTitles[e.ebook_id] = e.title;
  });

  const handleDownload = async (ebookId: string) => {
    setDownloading(ebookId);
    try {
      const url = await getEbookDownloadUrl(ebookId);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('No pudimos abrir el e-book. Intenta nuevamente.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="p-8">
      <SEO
        title="Mis compras — NOVU"
        description="Todos tus cursos, eventos, e-books y sesiones adquiridos en NOVU."
        path="/app/my-courses"
        noindex
      />
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold">Mis compras</h1>
          <p className="text-muted-foreground">
            Aquí encontrarás todo lo que has adquirido, en un solo lugar
          </p>
        </div>
        <Button variant="outline" onClick={handleSignOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg overflow-hidden animate-pulse">
              <div className="aspect-video bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-9 bg-muted rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Aún no tienes compras</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Explora el marketplace y encuentra cursos, e-books y eventos que te ayuden a alcanzar tus
            metas.
          </p>
          <Button onClick={() => navigate('/app/marketplace')} className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Ir al Marketplace
          </Button>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => {
              const meta = KIND_META[item.kind];
              const Icon = meta.icon;
              return (
                <div
                  key={item.key}
                  className="bg-card border border-border rounded-lg overflow-hidden flex flex-col"
                >
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {item.cover ? (
                      <img
                        src={item.cover}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <Icon className="h-10 w-10 text-primary/40" />
                      </div>
                    )}
                    <Badge variant="secondary" className="absolute top-2 left-2 gap-1">
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </Badge>
                  </div>
                  <div className="p-4 flex-1 flex flex-col gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold line-clamp-2">{item.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{item.subtitle}</p>
                    </div>
                    {item.to ? (
                      <Button asChild className="w-full gap-2">
                        <Link to={item.to}>
                          Acceder
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ) : item.ebookId ? (
                      <Button
                        className="w-full gap-2"
                        onClick={() => handleDownload(item.ebookId!)}
                        disabled={downloading === item.ebookId}
                      >
                        {downloading === item.ebookId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Descargar
                      </Button>
                    ) : item.meetUrl ? (
                      <Button asChild className="w-full gap-2">
                        <a href={item.meetUrl} target="_blank" rel="noopener noreferrer">
                          Entrar a la sesión
                          <ArrowUpRight className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : (
                      <Button variant="outline" className="w-full" disabled>
                        Sin acceso disponible
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {paidOrders && paidOrders.length > 0 && (
            <div className="mt-10">
              <Button
                variant="ghost"
                className="gap-2 mb-4"
                onClick={() => setShowHistory((v) => !v)}
              >
                <Receipt className="h-4 w-4" />
                {showHistory ? 'Ocultar historial de pagos' : 'Ver historial de pagos'}
              </Button>
              {showHistory && <MyPurchasesTable orders={paidOrders} titles={purchaseTitles} />}
            </div>
          )}
        </>
      )}
    </div>
  );
}
