import { useState, useEffect } from 'react';
import { useParams, Link, Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { sanitizeTextWithBreaks } from '@/lib/sanitize';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { formatDuration } from '@/lib/utils';
import { resolveProtectedUrl } from '@/lib/protectedMedia';
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
  Eye,
  Menu,
  MessagesSquare,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import CourseCommunityFeed from '@/components/community/CourseCommunityFeed';

export default function CoursePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isPreviewRoute = location.pathname.startsWith('/preview/');
  const isPreviewMode = searchParams.get('preview') === 'true' || isPreviewRoute;
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [view, setView] = useState<'lesson' | 'community'>('lesson');

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
  const { data: isCreator, isLoading: creatorCheckLoading } = useQuery({
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
          id, course_id, title, order_index, created_at,
          lessons (
            id, module_id, title, order_index, type, content_text, duration_minutes, description, created_at,
            bunny_video_id, bunny_status, video_source,
            lesson_resources ( id, lesson_id, file_name, created_at )
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

  // Compute current lesson early so we can sign protected URLs as a hook (must be top-level).
  // Video URLs (YouTube absolute or storage path) are resolved server-side via the
  // `get-protected-url` edge function — the client never reads `lessons.video_url` directly.
  const allLessonsPre = modules?.flatMap((m: any) => (m.lessons as any[]) || []) || [];
  const currentLessonForUrl = allLessonsPre.find((l: any) => l.id === selectedLessonId);
  const isVideoLesson = currentLessonForUrl?.type === 'video';
  const isBunnyVideo =
    isVideoLesson &&
    (currentLessonForUrl as any)?.video_source === 'bunny' &&
    !!(currentLessonForUrl as any)?.bunny_video_id;

  const bunnyVideoIdForUrl = (currentLessonForUrl as any)?.bunny_video_id as string | undefined;
  const { data: bunnySignedEmbed } = useQuery({
    queryKey: ['bunny-signed-embed', bunnyVideoIdForUrl],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('bunny-sign-embed', {
        body: { videoId: bunnyVideoIdForUrl },
      });
      if (error) throw error;
      return (data ?? {}) as { url?: string; expires?: number };
    },
    enabled: !!isBunnyVideo && !!bunnyVideoIdForUrl && (currentLessonForUrl as any)?.bunny_status === 'ready',
    staleTime: 50 * 60 * 1000,
    refetchInterval: 55 * 60 * 1000,
  });
  const bunnyEmbedUrl = bunnySignedEmbed?.url;

  // Poll Bunny status every 15s while the video is still processing.
  // When it becomes ready we invalidate the modules query so the iframe
  // replaces the placeholder without any flicker.
  useEffect(() => {
    const status = (currentLessonForUrl as any)?.bunny_status;
    if (!isBunnyVideo || !bunnyVideoIdForUrl || status === 'ready') return;
    let cancelled = false;
    const tick = async () => {
      try {
        const { data } = await supabase.functions.invoke('bunny-video-status', {
          body: { videoId: bunnyVideoIdForUrl },
        });
        if (cancelled) return;
        if ((data as any)?.status === 'ready') {
          queryClient.invalidateQueries({ queryKey: ['course-modules-player', id] });
        }
      } catch (e) {
        console.error('[bunny-poll]', e);
      }
    };
    const interval = window.setInterval(tick, 15000);
    // First check after a short delay so we react quickly if it's already done
    const first = window.setTimeout(tick, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(first);
    };
  }, [isBunnyVideo, bunnyVideoIdForUrl, (currentLessonForUrl as any)?.bunny_status, id, queryClient]);

  const { data: signedVideoUrl } = useQuery({
    queryKey: ['signed-video', currentLessonForUrl?.id],
    queryFn: () => resolveProtectedUrl('lesson_video', currentLessonForUrl!.id),
    enabled: !!isVideoLesson && !isBunnyVideo && !!currentLessonForUrl?.id && (!!enrollment || isPreviewMode),
    staleTime: 50 * 60 * 1000, // refresh before the 60-min TTL
  });
  const isYouTubeUrl = !!signedVideoUrl && /youtube\.com|youtu\.be/i.test(signedVideoUrl);

  // Prefetch the NEXT video lesson's signed URL + warm the browser cache so
  // moving to the next lesson feels instant.
  const nextVideoLesson = (() => {
    const idx = allLessonsPre.findIndex((l: any) => l.id === selectedLessonId);
    if (idx < 0) return null;
    return allLessonsPre.slice(idx + 1).find((l: any) => l.type === 'video') || null;
  })();
  const qcPrefetch = useQueryClient();
  useEffect(() => {
    if (!nextVideoLesson?.id || (!enrollment && !isPreviewMode)) return;
    qcPrefetch.prefetchQuery({
      queryKey: ['signed-video', nextVideoLesson.id],
      queryFn: async () => {
        const url = await resolveProtectedUrl('lesson_video', nextVideoLesson.id);
        // Warm the CDN / browser cache with a small range request.
        if (url && !/youtube\.com|youtu\.be/i.test(url)) {
          try {
            await fetch(url, { headers: { Range: 'bytes=0-524287' }, cache: 'force-cache' });
          } catch {}
        }
        return url;
      },
      staleTime: 50 * 60 * 1000,
    });
  }, [nextVideoLesson?.id, enrollment, isPreviewMode, qcPrefetch]);

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

  if ((enrollmentLoading && !isPreviewMode) || (creatorCheckLoading && isPreviewMode)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // In preview mode, only allow the creator
  if (isPreviewMode && !isCreator) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Solo el creador puede ver la vista previa de este curso.</p>
        <Button asChild variant="outline">
          <Link to="/">Volver al inicio</Link>
        </Button>
      </div>
    );
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

  const sidebarContent = (
    <>
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
                    onClick={() => { setSelectedLessonId(lesson.id); setView('lesson'); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors ${
                      isActive && view === 'lesson' ? 'bg-muted border-l-2 border-primary' : ''
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

        {course?.community_enabled && !isPreviewMode && (
          <button
            onClick={() => setView('community')}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-t border-sidebar-border ${
              view === 'community' ? 'bg-muted border-l-2 border-primary' : ''
            }`}
          >
            <MessagesSquare className={`h-5 w-5 flex-shrink-0 ${view === 'community' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className={`text-sm font-medium ${view === 'community' ? 'text-primary' : ''}`}>Comunidad</span>
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Preview Mode Banner */}
      {isPreviewMode && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-3 flex items-center justify-center gap-2 text-amber-800 text-center text-sm">
          <Eye className="h-5 w-5 flex-shrink-0" />
          <span className="font-medium">Vista previa del curso</span>
        </div>
      )}

      {/* Mobile topbar */}
      <div className="lg:hidden sticky top-0 z-40 flex h-12 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-3">
        <Link
          to={isPreviewMode ? `/creator-app/courses/${id}/edit` : "/app/my-courses"}
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Volver
        </Link>
        <p className="font-medium text-sm truncate mx-2 flex-1 text-center">
          {currentLesson?.title || course?.title}
        </p>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Lecciones">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="p-0 w-80 max-w-[85vw] bg-sidebar flex flex-col"
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest('button[data-lesson]') || target.closest('a')) {
                // allow default
              }
            }}
          >
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar - Course content (desktop) */}
        <aside className="hidden lg:flex w-80 bg-sidebar border-r border-sidebar-border flex-col">
          {sidebarContent}
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-background min-w-0">
          {view === 'community' && course?.community_enabled && id ? (
            <div className="p-4 md:p-8">
              <CourseCommunityFeed courseId={id} isCreator={!!isCreator} />
            </div>
          ) : currentLesson ? (
            <div className="max-w-4xl mx-auto p-4 md:p-8">
            {/* Video or Text content */}
            {currentLesson.type === 'video' ? (
              <div
                className="bg-black overflow-hidden mb-6"
                style={{ aspectRatio: '16 / 9', borderRadius: 12 }}
              >
                {isBunnyVideo ? (
                  (currentLessonForUrl as any)?.bunny_status === 'ready' && bunnyEmbedUrl ? (
                    <iframe
                      src={bunnyEmbedUrl}
                      loading="lazy"
                      className="w-full h-full"
                      style={{ border: 'none' }}
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center gap-4 text-center px-6"
                      style={{ backgroundColor: '#1a1a2e' }}
                    >
                      <Loader2 className="h-10 w-10 animate-spin" style={{ color: '#fcc70e' }} />
                      <div className="space-y-2">
                        <p className="text-white font-medium text-base" style={{ fontFamily: 'Inter, sans-serif' }}>
                          Tu video se está procesando
                        </p>
                        <p className="text-gray-400 text-sm max-w-md">
                          Esto puede tomar unos minutos. Recarga la página en unos minutos para ver el progreso.
                        </p>
                      </div>
                    </div>
                  )
                ) : signedVideoUrl ? (
                  isYouTubeUrl ? (
                    <iframe
                      src={signedVideoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      key={signedVideoUrl}
                      src={signedVideoUrl}
                      controls
                      playsInline
                      preload="auto"
                      className="w-full h-full"
                      controlsList="nodownload"
                    >
                      Tu navegador no soporta la reproducción de video.
                    </video>
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>
            ) : currentLesson.type === 'text' && currentLesson.content_text ? (
              <div className="bg-card border border-border rounded-lg p-8 mb-6 prose prose-sm max-w-none">
                <div dangerouslySetInnerHTML={{ __html: sanitizeTextWithBreaks(currentLesson.content_text) }} />
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
                    <button
                      key={resource.id}
                      type="button"
                      onClick={async () => {
                        try {
                          const url = await resolveProtectedUrl('lesson_resource', resource.id);
                          window.open(url, '_blank', 'noopener,noreferrer');
                        } catch (err: any) {
                          toast({
                            title: 'No se pudo abrir el recurso',
                            description: err?.message || 'Intenta nuevamente',
                            variant: 'destructive',
                          });
                        }
                      }}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Download className="h-4 w-4" />
                      {resource.file_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Module resources */}
            {currentLesson?.module_id && (
              <ModuleResourcesList moduleId={currentLesson.module_id} />
            )}



            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
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

function ModuleResourcesList({ moduleId }: { moduleId: string }) {
  const { toast } = useToast();
  const { data: resources = [] } = useQuery({
    queryKey: ['module-resources-player', moduleId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('module_resources').select('*')
        .eq('module_id', moduleId).order('order_index');
      if (error) throw error;
      return data as any[];
    },
    enabled: !!moduleId,
  });
  if (!resources.length) return null;
  return (
    <div className="bg-muted/50 rounded-lg p-4 mb-6">
      <h3 className="font-medium mb-3">Recursos del módulo</h3>
      <div className="space-y-2">
        {resources.map((r: any) => (
          <a
            key={r.id}
            href={r.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Download className="h-4 w-4" />
            {r.title}
          </a>
        ))}
      </div>
    </div>
  );
}
