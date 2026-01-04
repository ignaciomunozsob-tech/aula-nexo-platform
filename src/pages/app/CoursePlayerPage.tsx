import { useState, useEffect } from 'react';
import { useParams, Link, Navigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { formatDuration } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  FileText, 
  CheckCircle, 
  Circle, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Loader2,
  BookOpen,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CoursePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isPreviewMode = searchParams.get('preview') === 'true';
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  // Check enrollment (skip if preview mode)
  const { data: enrollment, isLoading: enrollmentLoading } = useQuery({
    queryKey: ['my-enrollment', id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id && !isPreviewMode,
  });

  // Check if user is the creator (for preview mode)
  const { data: isCreator } = useQuery({
    queryKey: ['is-course-creator', id, user?.id],
    queryFn: async () => {
      if (!user || !id) return false;
      const { data, error } = await supabase
        .from('courses')
        .select('creator_id')
        .eq('id', id)
        .single();
      
      if (error) return false;
      return data?.creator_id === user.id;
    },
    enabled: !!user && !!id && isPreviewMode,
  });

  // Get course with modules and lessons
  const { data: course } = useQuery({
    queryKey: ['course-player', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: modules } = useQuery({
    queryKey: ['course-modules-player', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select(`
          *,
          lessons (
            *,
            lesson_resources (*)
          )
        `)
        .eq('course_id', id!)
        .order('order_index', { ascending: true });
      
      if (error) throw error;
      return data?.map(m => ({
        ...m,
        lessons: (m.lessons as any[])?.sort((a, b) => a.order_index - b.order_index)
      }));
    },
    enabled: !!id && (!!enrollment || isPreviewMode),
  });

  // Get progress (skip if preview mode)
  const { data: progress } = useQuery({
    queryKey: ['lesson-progress', enrollment?.id],
    queryFn: async () => {
      if (!enrollment) return [];
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('enrollment_id', enrollment.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!enrollment?.id && !isPreviewMode,
  });

  // Select first lesson by default
  useEffect(() => {
    if (modules && modules.length > 0 && !selectedLessonId) {
      const firstLesson = (modules[0].lessons as any[])?.[0];
      if (firstLesson) {
        setSelectedLessonId(firstLesson.id);
      }
    }
  }, [modules, selectedLessonId]);

  // Mark lesson complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!enrollment) throw new Error('No enrollment');
      
      const existing = progress?.find(p => p.lesson_id === lessonId);
      
      if (existing) {
        const { error } = await supabase
          .from('lesson_progress')
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lesson_progress')
          .insert({
            enrollment_id: enrollment.id,
            lesson_id: lessonId,
            completed: true,
            completed_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress', enrollment?.id] });
      toast({
        title: '¡Lección completada!',
        description: 'Tu progreso ha sido guardado',
      });
    },
  });

  if (enrollmentLoading && !isPreviewMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // In preview mode, only allow the creator
  if (isPreviewMode && !isCreator) {
    return <Navigate to={`/course/${course?.slug || id}`} replace />;
  }

  if (!enrollment && !isPreviewMode) {
    return <Navigate to={`/course/${course?.slug || id}`} replace />;
  }

  // Find current lesson
  const allLessons = modules?.flatMap(m => (m.lessons as any[]) || []) || [];
  const currentLesson = allLessons.find(l => l.id === selectedLessonId);
  const currentLessonIndex = allLessons.findIndex(l => l.id === selectedLessonId);
  const prevLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < allLessons.length - 1 ? allLessons[currentLessonIndex + 1] : null;

  // Calculate progress
  const completedCount = progress?.filter(p => p.completed).length || 0;
  const totalLessons = allLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const isLessonComplete = (lessonId: string) => {
    return progress?.some(p => p.lesson_id === lessonId && p.completed);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-3 flex items-center justify-center gap-2 text-amber-800">
          <Eye className="h-5 w-5" />
          <span className="font-medium">Estás viendo el curso en formato vista previa</span>
          <span className="text-sm opacity-75">— Los cambios no guardados no se reflejarán aquí</span>
        </div>
      )}

      <div className="flex-1 flex">
      {/* Sidebar - Course content */}
      <aside className="w-80 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <Link 
            to={isPreviewMode ? `/creator-app/courses/${id}/edit` : "/app/my-courses"} 
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-3"
          >
            <ChevronLeft className="h-4 w-4" />
            {isPreviewMode ? 'Volver al editor' : 'Volver a mis cursos'}
          </Link>
          <h2 className="font-semibold line-clamp-2">{course?.title}</h2>
          {!isPreviewMode && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{progressPercent}% completado</span>
                <span>{completedCount}/{totalLessons}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {modules?.map((module, moduleIndex) => (
            <div key={module.id} className="border-b border-sidebar-border">
              <div className="px-4 py-3 bg-muted/50 font-medium text-sm">
                {moduleIndex + 1}. {module.title}
              </div>
              <div>
                {(module.lessons as any[])?.map((lesson) => {
                  const isComplete = isLessonComplete(lesson.id);
                  const isActive = lesson.id === selectedLessonId;
                  
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setSelectedLessonId(lesson.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                        isActive ? 'bg-muted border-l-2 border-primary' : ''
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${isActive ? 'font-medium text-primary' : ''}`}>
                          {lesson.title}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {lesson.type === 'video' ? <Play className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                          {lesson.duration_minutes > 0 && formatDuration(lesson.duration_minutes)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-background">
        {currentLesson ? (
          <div className="max-w-4xl mx-auto p-8">
            {/* Video or Text content */}
            {currentLesson.type === 'video' && currentLesson.video_url ? (
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
                {currentLesson.video_url.includes('youtube.com') || currentLesson.video_url.includes('youtu.be') ? (
                  <iframe
                    src={currentLesson.video_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={currentLesson.video_url}
                    controls
                    className="w-full h-full"
                    controlsList="nodownload"
                  >
                    Tu navegador no soporta la reproducción de video.
                  </video>
                )}
              </div>
            ) : currentLesson.type === 'text' && currentLesson.content_text ? (
              <div className="bg-card border border-border rounded-lg p-8 mb-6 prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: currentLesson.content_text.replace(/\n/g, '<br/>') }} />
              </div>
            ) : (
              <div className="bg-muted rounded-lg p-12 text-center mb-6">
                <BookOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Contenido no disponible</p>
              </div>
            )}

            {/* Lesson info */}
            <h1 className="text-2xl font-bold mb-4">{currentLesson.title}</h1>

            {/* Resources */}
            {currentLesson.lesson_resources?.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <h3 className="font-medium mb-3">Recursos descargables</h3>
                <div className="space-y-2">
                  {currentLesson.lesson_resources.map((resource: any) => (
                    <a
                      key={resource.id}
                      href={resource.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      {resource.file_name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between border-t border-border pt-6">
              <div>
                {prevLesson && (
                  <Button variant="ghost" onClick={() => setSelectedLessonId(prevLesson.id)}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                )}
              </div>

              {!isPreviewMode && (
                <Button
                  onClick={() => markCompleteMutation.mutate(currentLesson.id)}
                  disabled={isLessonComplete(currentLesson.id) || markCompleteMutation.isPending}
                  variant={isLessonComplete(currentLesson.id) ? 'outline' : 'default'}
                >
                  {isLessonComplete(currentLesson.id) ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Completada
                    </>
                  ) : (
                    'Marcar como completada'
                  )}
                </Button>
              )}

              {isPreviewMode && (
                <div className="text-sm text-muted-foreground italic">
                  Vista previa — sin progreso
                </div>
              )}

              <div>
                {nextLesson && (
                  <Button onClick={() => setSelectedLessonId(nextLesson.id)}>
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">Selecciona una lección para comenzar</p>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
