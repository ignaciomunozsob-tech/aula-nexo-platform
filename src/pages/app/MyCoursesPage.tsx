import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { BookOpen, Play, ShoppingBag, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MyCoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch course enrollments
  const { data: enrollments, isLoading: loadingCourses } = useQuery({
    queryKey: ['my-enrollments-all', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses (
            id,
            title,
            slug,
            cover_image_url,
            duration_minutes_est
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('purchased_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch event registrations
  const { data: eventRegistrations, isLoading: loadingEvents } = useQuery({
    queryKey: ['my-events', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          *,
          events (
            id,
            title,
            slug,
            cover_image_url,
            event_date,
            event_type
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'registered')
        .order('registered_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const isLoading = loadingCourses || loadingEvents;
  const hasCourses = enrollments && enrollments.length > 0;
  const hasEvents = eventRegistrations && eventRegistrations.length > 0;
  const hasNoProducts = !hasCourses && !hasEvents;

  // Determine available tabs
  const availableTabs: { id: string; label: string; icon: React.ReactNode }[] = [];
  if (hasCourses) {
    availableTabs.push({ id: 'courses', label: 'Cursos', icon: <BookOpen className="h-4 w-4" /> });
  }
  if (hasEvents) {
    availableTabs.push({ id: 'events', label: 'Eventos', icon: <Calendar className="h-4 w-4" /> });
  }

  const defaultTab = availableTabs[0]?.id || 'courses';

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Mis Productos</h1>
        <p className="text-muted-foreground">
          Todos los productos que has adquirido
        </p>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg overflow-hidden animate-pulse">
              <div className="aspect-video bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : hasNoProducts ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Aún no tienes productos</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Explora nuestro marketplace y encuentra cursos, ebooks y eventos que te ayuden a alcanzar tus metas.
          </p>
          <Button onClick={() => navigate('/app/marketplace')} className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Ir al Marketplace
          </Button>
        </div>
      ) : (
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-6">
            {availableTabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
                {tab.icon}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {hasCourses && (
            <TabsContent value="courses">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrollments?.map((enrollment) => {
                  const course = enrollment.courses as any;
                  return (
                    <Link
                      key={enrollment.id}
                      to={`/app/course/${course.id}`}
                      className="bg-card border border-border rounded-lg overflow-hidden card-hover"
                    >
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        {course.cover_image_url ? (
                          <img
                            src={course.cover_image_url}
                            alt={course.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <BookOpen className="h-12 w-12 text-primary/30" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
                            <Play className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold line-clamp-2">{course.title}</h3>
                        <div className="mt-3">
                          <div className="progress-bar">
                            <div className="progress-fill" style={{ width: '0%' }} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">0% completado</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </TabsContent>
          )}

          {hasEvents && (
            <TabsContent value="events">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventRegistrations?.map((registration) => {
                  const event = registration.events as any;
                  const eventDate = new Date(event.event_date);
                  return (
                    <div
                      key={registration.id}
                      className="bg-card border border-border rounded-lg overflow-hidden"
                    >
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        {event.cover_image_url ? (
                          <img
                            src={event.cover_image_url}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                            <Calendar className="h-12 w-12 text-primary/30" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                          {event.event_type === 'online' ? 'Online' : 'Presencial'}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold line-clamp-2">{event.title}</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          {eventDate.toLocaleDateString('es-CL', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
