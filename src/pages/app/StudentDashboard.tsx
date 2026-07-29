import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { BookOpen, Calendar, FileText, CalendarDays, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SEO } from '@/components/SEO';
import { useMyEbooks, useMySessionBookings } from '@/hooks/useStudentLibrary';

type ProductKind = 'course' | 'event' | 'ebook' | 'session';

type ProductItem = {
  key: string;
  kind: ProductKind;
  title: string;
  cover: string | null;
  to: string;
  progress: number;
  progressLabel: string;
  date: number;
};

const KIND_META: Record<ProductKind, { label: string; icon: typeof BookOpen; accent: string }> = {
  course: { label: 'Curso', icon: BookOpen, accent: 'bg-primary/10 text-primary' },
  event: { label: 'Evento', icon: Calendar, accent: 'bg-success/10 text-success' },
  ebook: { label: 'E-book', icon: FileText, accent: 'bg-warning/10 text-warning' },
  session: { label: 'Sesión 1:1', icon: CalendarDays, accent: 'bg-primary/10 text-primary' },
};

export default function StudentDashboard() {
  const { profile, user } = useAuth();

  const { data: courses } = useQuery({
    queryKey: ['dashboard-courses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, purchased_at, courses ( id, title, cover_image_url )')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('purchased_at', { ascending: false });
      if (error) throw error;

      const rows = (data || []).filter((e) => !!e.courses);
      if (rows.length === 0) return [];

      const courseIds = rows.map((e: any) => e.courses.id);
      const enrollmentIds = rows.map((e: any) => e.id);

      const [{ data: modules }, { data: progress }] = await Promise.all([
        supabase.from('course_modules').select('id, course_id').in('course_id', courseIds),
        supabase
          .from('lesson_progress')
          .select('enrollment_id, lesson_id, completed')
          .in('enrollment_id', enrollmentIds)
          .eq('completed', true),
      ]);

      const moduleIds = (modules || []).map((m) => m.id);
      let lessons: { id: string; module_id: string }[] = [];
      if (moduleIds.length) {
        const { data: l } = await supabase.from('lessons').select('id, module_id').in('module_id', moduleIds);
        lessons = l || [];
      }
      const moduleToCourse = new Map((modules || []).map((m) => [m.id, m.course_id]));
      const lessonsPerCourse = new Map<string, number>();
      for (const l of lessons) {
        const cid = moduleToCourse.get(l.module_id);
        if (cid) lessonsPerCourse.set(cid, (lessonsPerCourse.get(cid) || 0) + 1);
      }
      const doneByEnrollment = new Map<string, number>();
      for (const p of progress || []) {
        doneByEnrollment.set(p.enrollment_id, (doneByEnrollment.get(p.enrollment_id) || 0) + 1);
      }

      return rows.map((e: any) => {
        const total = lessonsPerCourse.get(e.courses.id) || 0;
        const done = doneByEnrollment.get(e.id) || 0;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return {
          id: e.courses.id,
          title: e.courses.title as string,
          cover: e.courses.cover_image_url as string | null,
          purchased_at: e.purchased_at as string,
          pct,
          done,
          total,
        };
      });
    },
    enabled: !!user,
  });

  const { data: events } = useQuery({
    queryKey: ['dashboard-events', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('event_registrations')
        .select('id, registered_at, events ( id, title, cover_image_url, event_date, slug )')
        .eq('user_id', user.id)
        .eq('status', 'registered');
      if (error) throw error;
      return (data || []).filter((r) => !!r.events);
    },
    enabled: !!user,
  });

  const { data: ebooks } = useMyEbooks();
  const { data: bookings } = useMySessionBookings();

  const items: ProductItem[] = [];

  for (const c of courses || []) {
    items.push({
      key: `course-${c.id}`,
      kind: 'course',
      title: c.title,
      cover: c.cover,
      to: `/app/course/${c.id}`,
      progress: c.pct,
      progressLabel: c.total > 0 ? `${c.done}/${c.total} lecciones` : 'Sin lecciones aún',
      date: new Date(c.purchased_at || 0).getTime(),
    });
  }

  for (const r of events || []) {
    const ev = r.events as any;
    const past = new Date(ev.event_date).getTime() < Date.now();
    items.push({
      key: `event-${r.id}`,
      kind: 'event',
      title: ev.title,
      cover: ev.cover_image_url,
      to: '/app/my-courses',
      progress: past ? 100 : 0,
      progressLabel: past
        ? 'Finalizado'
        : `Próximo · ${new Date(ev.event_date).toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'short',
            timeZone: 'America/Santiago',
          })}`,
      date: new Date(r.registered_at || 0).getTime(),
    });
  }

  for (const e of ebooks || []) {
    items.push({
      key: `ebook-${e.ebook_id}`,
      kind: 'ebook',
      title: e.title,
      cover: e.cover_image_url,
      to: '/app/my-courses',
      progress: 100,
      progressLabel: 'Disponible para descargar',
      date: new Date(e.purchased_at || 0).getTime(),
    });
  }

  for (const b of bookings || []) {
    const past = new Date(b.end_at).getTime() < Date.now();
    const cancelled = b.status === 'cancelled';
    items.push({
      key: `session-${b.id}`,
      kind: 'session',
      title: b.session_title,
      cover: null,
      to: '/app/my-courses',
      progress: cancelled ? 0 : past ? 100 : 0,
      progressLabel: cancelled
        ? 'Cancelada'
        : past
        ? 'Realizada'
        : `Agendada · ${new Date(b.start_at).toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'short',
            timeZone: 'America/Santiago',
          })}`,
      date: new Date(b.start_at || 0).getTime(),
    });
  }

  items.sort((a, b) => b.date - a.date);

  return (
    <div className="p-8">
      <SEO
        title="Mis productos — NOVU"
        description="Continúa tu aprendizaje en NOVU."
        path="/app"
        noindex
      />
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Bienvenido, {profile?.name?.split(' ')[0] || 'Estudiante'}
        </h1>
        <p className="text-muted-foreground">Todos tus productos adquiridos en un solo lugar</p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Mis productos</h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/my-courses">
            Ver todos mis productos
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-10 text-center">
          <p className="text-muted-foreground mb-4">Aún no tienes productos adquiridos</p>
          <Button asChild>
            <Link to="/courses">Explorar marketplace</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((item) => {
            const meta = KIND_META[item.kind];
            const Icon = meta.icon;
            return (
              <Link
                key={item.key}
                to={item.to}
                className="group bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors flex flex-col"
              >
                <div className="aspect-video bg-muted relative overflow-hidden">
                  {item.cover ? (
                    <img
                      src={item.cover}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                    />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${meta.accent}`}>
                      <Icon className="h-8 w-8" />
                    </div>
                  )}
                  <Badge variant="secondary" className="absolute top-2 left-2 gap-1">
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </Badge>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <p className="font-medium line-clamp-2">{item.title}</p>
                  <div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${item.progress}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">{item.progressLabel}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
