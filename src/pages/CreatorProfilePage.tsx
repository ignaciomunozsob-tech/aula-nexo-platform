import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePageView } from '@/hooks/usePageView';
import { CourseCard } from '@/components/courses/CourseCard';
import { User, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CreatorProfilePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: creator, isLoading } = useQuery({
    queryKey: ['creator', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('creator_slug', slug)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  // Track page view
  usePageView('creator_profile', creator?.id);

  const { data: courses } = useQuery({
    queryKey: ['creator-courses', creator?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('creator_id', creator!.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!creator?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="page-container text-center py-20">
        <h1 className="text-2xl font-bold mb-4">Creador no encontrado</h1>
        <Button asChild>
          <Link to="/courses">Ver cursos</Link>
        </Button>
      </div>
    );
  }

  const links = Array.isArray(creator.links) ? creator.links : [];

  return (
    <div className="page-container">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-primary/10 to-background rounded-2xl p-8 mb-12">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
            {creator.avatar_url ? (
              <img
                src={creator.avatar_url}
                alt={creator.name || 'Creador'}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <User className="h-12 w-12 text-primary" />
            )}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-bold">{creator.name}</h1>
            <p className="text-primary font-medium mt-1">Creador de cursos</p>
            
            {creator.bio && (
              <p className="text-muted-foreground mt-4 max-w-2xl">{creator.bio}</p>
            )}

            {links.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                {links.map((link: any, index: number) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {link.label || link.url}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Courses */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Cursos publicados</h2>
        
        {courses && courses.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                id={course.id}
                slug={course.slug}
                title={course.title}
                description={course.description}
                coverImageUrl={course.cover_image_url}
                priceCLP={course.price_clp}
                level={course.level}
                durationMinutes={course.duration_minutes_est}
                creatorName={creator.name}
                creatorSlug={creator.creator_slug}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Este creador aún no tiene cursos publicados.</p>
        )}
      </div>
    </div>
  );
}
