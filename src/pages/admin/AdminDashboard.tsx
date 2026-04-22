import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GraduationCap, Users, TrendingUp, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [{ count: novuCourses }, { count: enrollments }, { count: published }] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('is_novu_official', true),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .eq('is_novu_official', true)
          .eq('status', 'published'),
      ]);

      return {
        novuCourses: novuCourses || 0,
        enrollments: enrollments || 0,
        published: published || 0,
      };
    },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Panel de Administración</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona los cursos y carreras oficiales de NOVU
          </p>
        </div>
        <Button asChild size="lg">
          <Link to="/admin/courses/new">
            <Plus className="h-5 w-5 mr-2" />
            Nuevo curso NOVU
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cursos NOVU totales
            </CardTitle>
            <GraduationCap className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.novuCourses ?? '–'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cursos publicados
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.published ?? '–'}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inscripciones activas
            </CardTitle>
            <Users className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.enrollments ?? '–'}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones rápidas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Button variant="outline" asChild className="h-auto justify-start py-4">
            <Link to="/admin/courses">
              <GraduationCap className="h-5 w-5 mr-3 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Gestionar cursos NOVU</div>
                <div className="text-xs text-muted-foreground">
                  Crea, edita y publica cursos oficiales
                </div>
              </div>
            </Link>
          </Button>
          <Button variant="outline" asChild className="h-auto justify-start py-4">
            <Link to="/admin/instructors">
              <Users className="h-5 w-5 mr-3 text-primary" />
              <div className="text-left">
                <div className="font-semibold">Instructores NOVU</div>
                <div className="text-xs text-muted-foreground">
                  Profesores oficiales como Ignacio Muñoz
                </div>
              </div>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
