import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { BookOpen, Play, Trophy, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function StudentDashboard() {
  const { profile } = useAuth();

  const { data: enrollments } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          *,
          courses (
            id,
            title,
            slug,
            cover_image_url
          )
        `)
        .eq('status', 'active')
        .order('purchased_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Bienvenido, {profile?.name?.split(' ')[0] || 'Estudiante'}
        </h1>
        <p className="text-muted-foreground">
          Continúa tu aprendizaje donde lo dejaste
        </p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{enrollments?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Cursos inscritos</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">0</p>
              <p className="text-sm text-muted-foreground">Completados</p>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
              <Play className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{enrollments?.length || 0}</p>
              <p className="text-sm text-muted-foreground">En progreso</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Courses */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Mis cursos recientes</h2>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/app/my-courses">
              Ver todos
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>

        {enrollments && enrollments.length > 0 ? (
          <div className="space-y-4">
            {enrollments.map((enrollment) => {
              const course = enrollment.courses as any;
              return (
                <Link
                  key={enrollment.id}
                  to={`/app/course/${course.id}`}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="w-16 h-10 rounded bg-muted overflow-hidden flex-shrink-0">
                    {course.cover_image_url ? (
                      <img
                        src={course.cover_image_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{course.title}</p>
                    <div className="progress-bar mt-2">
                      <div className="progress-fill" style={{ width: '0%' }} />
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Play className="h-4 w-4" />
                  </Button>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Aún no estás inscrito en ningún curso</p>
            <Button asChild>
              <Link to="/courses">Explorar cursos</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
