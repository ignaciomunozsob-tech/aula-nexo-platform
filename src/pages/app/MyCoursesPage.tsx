import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { BookOpen, Play, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function MyCoursesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: enrollments, isLoading } = useQuery({
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

  const hasNoCourses = !isLoading && (!enrollments || enrollments.length === 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Mis Cursos</h1>
        <p className="text-muted-foreground">
          Todos los cursos en los que estás inscrito
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
      ) : hasNoCourses ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <BookOpen className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Aún no tienes cursos</h2>
          <p className="text-muted-foreground mb-6 max-w-sm">
            Explora nuestro marketplace y encuentra cursos que te ayuden a alcanzar tus metas.
          </p>
          <Button onClick={() => navigate('/app/marketplace')} className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Ir al Marketplace
          </Button>
        </div>
      ) : (
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
      )}
    </div>
  );
}
