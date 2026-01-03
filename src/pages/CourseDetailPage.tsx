import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { usePageView } from '@/hooks/usePageView';
import { formatPrice, formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Clock, User, BookOpen, CheckCircle, Play, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CourseDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          profiles:creator_id (
            id,
            name,
            creator_slug,
            bio,
            avatar_url
          ),
          categories:category_id (
            name,
            slug
          )
        `)
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Track page view
  usePageView('course', course?.id);

  const { data: modules } = useQuery({
    queryKey: ['course-modules-public', course?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select(`
          *,
          lessons (
            id,
            title,
            type,
            duration_minutes,
            order_index
          )
        `)
        .eq('course_id', course!.id)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data?.map(m => ({
        ...m,
        lessons: (m.lessons as any[])?.sort((a, b) => a.order_index - b.order_index)
      }));
    },
    enabled: !!course?.id,
  });

  const { data: enrollment } = useQuery({
    queryKey: ['enrollment', course?.id, user?.id],
    queryFn: async () => {
      if (!user || !course) return null;
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', course.id)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!course?.id,
  });

  const enrollMutation = useMutation({
    mutationFn: async () => {
      if (!user || !course) throw new Error('No user or course');
      
      const { error } = await supabase
        .from('enrollments')
        .insert({
          course_id: course.id,
          user_id: user.id,
          status: 'active',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment', course?.id] });
      toast({
        title: '¡Inscripción exitosa!',
        description: 'Ya puedes acceder al contenido del curso',
      });
      navigate(`/app/course/${course?.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Error al inscribirse',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleEnroll = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    enrollMutation.mutate();
  };

  const totalLessons = modules?.reduce((acc, m) => acc + ((m.lessons as any[])?.length || 0), 0) || 0;
  const totalDuration = modules?.reduce((acc, m) => 
    acc + ((m.lessons as any[])?.reduce((a, l) => a + (l.duration_minutes || 0), 0) || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="page-container text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Curso no encontrado</h1>
        <Button asChild>
          <Link to="/courses">Ver todos los cursos</Link>
        </Button>
      </div>
    );
  }

  const creator = course.profiles as any;
  const category = course.categories as any;

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {category && (
                <Link
                  to={`/courses?category=${category.slug}`}
                  className="text-primary text-sm font-medium hover:underline"
                >
                  {category.name}
                </Link>
              )}
              <h1 className="text-3xl md:text-4xl font-bold mt-2 mb-4">{course.title}</h1>
              
              {course.description && (
                <p className="text-lg text-muted-foreground mb-6">{course.description}</p>
              )}

              {/* Creator */}
              {creator && (
                <Link
                  to={creator.creator_slug ? `/creator/${creator.creator_slug}` : '#'}
                  className="flex items-center gap-3 mb-6 group"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt={creator.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium group-hover:text-primary transition-colors">{creator.name}</p>
                    <p className="text-sm text-muted-foreground">Creador del curso</p>
                  </div>
                </Link>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                {totalLessons > 0 && (
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {totalLessons} lecciones
                  </span>
                )}
                {totalDuration > 0 && (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {formatDuration(totalDuration)}
                  </span>
                )}
                {course.level && (
                  <span className="px-2 py-1 bg-muted rounded-full capitalize">
                    {course.level === 'beginner' ? 'Principiante' : course.level === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                  </span>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-lg overflow-hidden sticky top-24">
                {course.cover_image_url && (
                  <img
                    src={course.cover_image_url}
                    alt={course.title}
                    className="w-full aspect-video object-cover"
                  />
                )}
                <div className="p-6">
                  <p className="text-3xl font-bold mb-4">
                    {course.price_clp === 0 ? 'Gratis' : formatPrice(course.price_clp)}
                  </p>
                  
                  {enrollment?.status === 'active' ? (
                    <Button asChild className="w-full" size="lg">
                      <Link to={`/app/course/${course.id}`}>
                        <Play className="h-4 w-4 mr-2" />
                        Continuar curso
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleEnroll}
                      disabled={enrollMutation.isPending}
                    >
                      {enrollMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Inscribiendo...
                        </>
                      ) : course.price_clp === 0 ? (
                        'Inscribirme gratis'
                      ) : (
                        'Inscribirme (Demo)'
                      )}
                    </Button>
                  )}
                  
                  {course.price_clp > 0 && !enrollment && (
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      * Inscripción demo sin pago real
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="lg:max-w-3xl">
          <h2 className="text-2xl font-bold mb-6">Contenido del curso</h2>
          
          {modules && modules.length > 0 ? (
            <div className="space-y-4">
              {modules.map((module, moduleIndex) => (
                <div key={module.id} className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-3 font-medium">
                    Módulo {moduleIndex + 1}: {module.title}
                  </div>
                  <div className="divide-y divide-border">
                    {(module.lessons as any[])?.map((lesson, lessonIndex) => (
                      <div key={lesson.id} className="px-4 py-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm text-muted-foreground">
                          {lesson.type === 'video' ? (
                            <Play className="h-4 w-4" />
                          ) : (
                            <FileText className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{lesson.title}</p>
                        </div>
                        {lesson.duration_minutes > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {lesson.duration_minutes} min
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">El contenido del curso se está preparando...</p>
          )}
        </div>
      </div>
    </div>
  );
}
