import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Eye, Users, BookOpen, FileText, Calendar } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewProductDialog } from '@/components/creator/NewProductDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function CreatorProductsPage() {
  const { user } = useAuth();
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<{ id: string; title: string } | null>(null);

  // Fetch courses
  const { data: courses, isLoading: loadingCourses } = useQuery({
    queryKey: ['creator-courses', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch ebooks
  const { data: ebooks, isLoading: loadingEbooks } = useQuery({
    queryKey: ['creator-ebooks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ebooks')
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch events
  const { data: events, isLoading: loadingEvents } = useQuery({
    queryKey: ['creator-events', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', user!.id)
        .order('event_date', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get enrollment counts for courses
  const { data: enrollmentCounts } = useQuery({
    queryKey: ['creator-courses-enrollments', user?.id],
    queryFn: async () => {
      const courseIds = courses?.map((c) => c.id) || [];
      if (courseIds.length === 0) return {};

      const { data, error } = await supabase
        .from('enrollments')
        .select('course_id')
        .in('course_id', courseIds)
        .eq('status', 'active');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((e) => {
        counts[e.course_id] = (counts[e.course_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!courses && courses.length > 0,
  });

  // Get event registration counts
  const { data: eventRegistrationCounts } = useQuery({
    queryKey: ['creator-event-registrations', user?.id],
    queryFn: async () => {
      const eventIds = events?.map((e) => e.id) || [];
      if (eventIds.length === 0) return {};

      const { data, error } = await supabase
        .from('event_registrations')
        .select('event_id')
        .in('event_id', eventIds)
        .eq('status', 'registered');

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((r) => {
        counts[r.event_id] = (counts[r.event_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!events && events.length > 0,
  });

  // Get students for selected course
  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['course-students', selectedCourse?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, purchased_at, status, profiles:user_id(id, name, avatar_url)')
        .eq('course_id', selectedCourse!.id)
        .eq('status', 'active')
        .order('purchased_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCourse,
  });

  const StatusBadge = ({ status }: { status: string }) => (
    <span className={status === 'published' ? 'badge-published' : 'badge-draft'}>
      {status === 'published' ? 'Publicado' : 'Borrador'}
    </span>
  );

  const EmptyState = ({ type, onCreate }: { type: string; onCreate: () => void }) => (
    <div className="text-center py-12 bg-card border border-border rounded-lg">
      <p className="text-muted-foreground mb-4">No tienes {type} aún</p>
      <Button onClick={onCreate}>Crear mi primer {type.slice(0, -1)}</Button>
    </div>
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Mis Productos</h1>
        <Button onClick={() => setNewProductOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="courses" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Cursos ({courses?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="ebooks" className="gap-2">
            <FileText className="h-4 w-4" />
            E-books ({ebooks?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-2">
            <Calendar className="h-4 w-4" />
            Eventos ({events?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses">
          {loadingCourses ? (
            <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : courses?.length ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Producto</th>
                    <th className="text-left p-4 font-medium">Estado</th>
                    <th className="text-left p-4 font-medium">Precio</th>
                    <th className="text-center p-4 font-medium">Alumnos</th>
                    <th className="text-right p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {courses.map(course => (
                    <tr key={course.id}>
                      <td className="p-4"><p className="font-medium">{course.title}</p></td>
                      <td className="p-4"><StatusBadge status={course.status} /></td>
                      <td className="p-4">{formatPrice(course.price_clp)}</td>
                      <td className="p-4 text-center">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedCourse({ id: course.id, title: course.title })}
                          className="gap-1"
                        >
                          <Users className="h-4 w-4" />
                          {enrollmentCounts?.[course.id] || 0}
                        </Button>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/creator-app/courses/${course.id}/edit`}><Edit className="h-4 w-4" /></Link>
                        </Button>
                        {course.status === 'published' && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/course/${course.slug}`} target="_blank"><Eye className="h-4 w-4" /></Link>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState type="cursos" onCreate={() => setNewProductOpen(true)} />
          )}
        </TabsContent>

        {/* E-books Tab */}
        <TabsContent value="ebooks">
          {loadingEbooks ? (
            <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : ebooks?.length ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Producto</th>
                    <th className="text-left p-4 font-medium">Estado</th>
                    <th className="text-left p-4 font-medium">Precio</th>
                    <th className="text-right p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ebooks.map(ebook => (
                    <tr key={ebook.id}>
                      <td className="p-4"><p className="font-medium">{ebook.title}</p></td>
                      <td className="p-4"><StatusBadge status={ebook.status} /></td>
                      <td className="p-4">{formatPrice(ebook.price_clp)}</td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/creator-app/ebooks/${ebook.id}/edit`}><Edit className="h-4 w-4" /></Link>
                        </Button>
                        {ebook.status === 'published' && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/ebook/${ebook.slug}`} target="_blank"><Eye className="h-4 w-4" /></Link>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState type="e-books" onCreate={() => setNewProductOpen(true)} />
          )}
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events">
          {loadingEvents ? (
            <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
          ) : events?.length ? (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-medium">Evento</th>
                    <th className="text-left p-4 font-medium">Fecha</th>
                    <th className="text-left p-4 font-medium">Estado</th>
                    <th className="text-left p-4 font-medium">Precio</th>
                    <th className="text-center p-4 font-medium">Inscritos</th>
                    <th className="text-right p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.map(event => (
                    <tr key={event.id}>
                      <td className="p-4"><p className="font-medium">{event.title}</p></td>
                      <td className="p-4">
                        {new Date(event.event_date).toLocaleDateString('es-CL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-4"><StatusBadge status={event.status} /></td>
                      <td className="p-4">{formatPrice(event.price_clp)}</td>
                      <td className="p-4 text-center">
                        <span className="text-sm">
                          {eventRegistrationCounts?.[event.id] || 0}
                          {event.max_attendees && ` / ${event.max_attendees}`}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/creator-app/events/${event.id}/edit`}><Edit className="h-4 w-4" /></Link>
                        </Button>
                        {event.status === 'published' && (
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/event/${event.slug}`} target="_blank"><Eye className="h-4 w-4" /></Link>
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState type="eventos" onCreate={() => setNewProductOpen(true)} />
          )}
        </TabsContent>
      </Tabs>

      {/* New Product Dialog */}
      <NewProductDialog open={newProductOpen} onOpenChange={setNewProductOpen} />

      {/* Students Dialog */}
      <Dialog open={!!selectedCourse} onOpenChange={() => setSelectedCourse(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Alumnos inscritos - {selectedCourse?.title}</DialogTitle>
          </DialogHeader>
          {loadingStudents ? (
            <div className="py-8 text-center text-muted-foreground">Cargando...</div>
          ) : students && students.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Fecha de inscripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student: any) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      {student.profiles?.name || 'Usuario'}
                    </TableCell>
                    <TableCell>
                      {new Date(student.purchased_at).toLocaleDateString('es-CL')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No hay alumnos inscritos en este curso
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
