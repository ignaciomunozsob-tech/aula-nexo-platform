import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { BookOpen, Users, Eye, Plus, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CreatorDashboard() {
  const { user, profile } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['creator-stats', user?.id],
    queryFn: async () => {
      const [coursesRes, enrollmentsRes, viewsRes] = await Promise.all([
        supabase.from('courses').select('id', { count: 'exact' }).eq('creator_id', user!.id),
        supabase.from('enrollments').select('id, courses!inner(creator_id)', { count: 'exact' }).eq('courses.creator_id', user!.id),
        supabase.from('page_views').select('id', { count: 'exact' }).or(`type.eq.creator_profile,type.eq.course`).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      ]);
      
      return {
        courses: coursesRes.count || 0,
        students: enrollmentsRes.count || 0,
        views: viewsRes.count || 0,
      };
    },
    enabled: !!user,
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Panel de Creador</h1>
          <p className="text-muted-foreground">Bienvenido, {profile?.name}</p>
        </div>
        <Button asChild>
          <Link to="/creator-app/courses/new">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Curso
          </Link>
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-3xl font-bold">{stats?.courses || 0}</p>
              <p className="text-sm text-muted-foreground">Cursos</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-3xl font-bold">{stats?.students || 0}</p>
              <p className="text-sm text-muted-foreground">Estudiantes</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
              <Eye className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-3xl font-bold">{stats?.views || 0}</p>
              <p className="text-sm text-muted-foreground">Vistas (30d)</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="font-semibold mb-4">Acciones rápidas</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Link to="/creator-app/courses" className="p-4 border border-border rounded-lg hover:bg-muted transition-colors">
            <BookOpen className="h-6 w-6 text-primary mb-2" />
            <p className="font-medium">Gestionar cursos</p>
            <p className="text-sm text-muted-foreground">Ver y editar tus cursos</p>
          </Link>
          <Link to="/creator-app/profile" className="p-4 border border-border rounded-lg hover:bg-muted transition-colors">
            <TrendingUp className="h-6 w-6 text-primary mb-2" />
            <p className="font-medium">Editar perfil público</p>
            <p className="text-sm text-muted-foreground">Personaliza tu vitrina</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
