import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Eye, Users } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
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

export default function CreatorCoursesPage() {
  const { user } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<{ id: string; title: string } | null>(null);

  const { data: courses, isLoading } = useQuery({
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

  // Get enrollment counts for all courses
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

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Mis Cursos</h1>
        <Button asChild>
          <Link to="/creator-app/courses/new"><Plus className="h-4 w-4 mr-2" />Nuevo Curso</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />)}</div>
      ) : courses?.length ? (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Curso</th>
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
                  <td className="p-4">
                    <span className={course.status === 'published' ? 'badge-published' : 'badge-draft'}>
                      {course.status === 'published' ? 'Publicado' : 'Borrador'}
                    </span>
                  </td>
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
        <div className="text-center py-12 bg-card border border-border rounded-lg">
          <p className="text-muted-foreground mb-4">No tienes cursos aún</p>
          <Button asChild><Link to="/creator-app/courses/new">Crear mi primer curso</Link></Button>
        </div>
      )}

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
