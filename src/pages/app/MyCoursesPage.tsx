import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Play } from 'lucide-react';
import { MarketplaceView } from '@/components/marketplace/MarketplaceView';

export default function MyCoursesPage() {
  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['my-enrollments-all'],
    queryFn: async () => {
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
        .eq('status', 'active')
        .order('purchased_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Show marketplace when user has no courses
  const showMarketplace = !isLoading && (!enrollments || enrollments.length === 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Mis Cursos</h1>
        <p className="text-muted-foreground">
          {showMarketplace 
            ? 'Explora y descubre contenido para potenciar tus habilidades'
            : 'Todos los cursos en los que estás inscrito'}
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
      ) : showMarketplace ? (
        <MarketplaceView />
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
