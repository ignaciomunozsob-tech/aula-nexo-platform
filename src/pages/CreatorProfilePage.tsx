import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePageView } from '@/hooks/usePageView';
import { useAuth } from '@/lib/auth';
import { CourseCard } from '@/components/courses/CourseCard';
import { User, Loader2, Star, Instagram, Linkedin, Globe, Youtube, Twitter, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  
  return null;
}

function StarRating({ value, onChange, readOnly = false }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          className={`${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star
            className={`h-5 w-5 ${star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
          />
        </button>
      ))}
    </div>
  );
}

const socialIcons: Record<string, any> = {
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
  youtube: Youtube,
  website: Globe,
};

export default function CreatorProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');

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

  const { data: reviews } = useQuery({
    queryKey: ['creator-reviews', creator?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_reviews')
        .select('*, reviewer:reviewer_id(name, avatar_url)')
        .eq('creator_id', creator!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!creator?.id,
  });

  const { data: userReview } = useQuery({
    queryKey: ['user-review', creator?.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_reviews')
        .select('*')
        .eq('creator_id', creator!.id)
        .eq('reviewer_id', user!.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!creator?.id && !!user?.id,
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (userReview) {
        const { error } = await supabase
          .from('creator_reviews')
          .update({ rating: newRating, comment: newComment })
          .eq('id', userReview.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('creator_reviews')
          .insert({
            creator_id: creator!.id,
            reviewer_id: user!.id,
            rating: newRating,
            comment: newComment,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-reviews', creator?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-review', creator?.id, user?.id] });
      toast({ title: userReview ? 'Evaluación actualizada' : 'Evaluación enviada' });
      setNewComment('');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
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
  const introVideoUrl = (creator as any).intro_video_url;
  const embedUrl = getEmbedUrl(introVideoUrl);

  const avgRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const canReview = user && user.id !== creator.id;

  return (
    <div className="page-container">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-primary/10 to-background rounded-2xl p-8 mb-12">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
            {creator.avatar_url ? (
              <img
                src={creator.avatar_url}
                alt={creator.name || 'Creador'}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-14 w-14 text-primary" />
            )}
          </div>
          <div className="text-center md:text-left flex-1">
            <h1 className="text-3xl font-bold">{creator.name}</h1>
            <p className="text-primary font-medium mt-1">Creador de cursos</p>
            
            {avgRating && (
              <div className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">{avgRating}</span>
                <span className="text-muted-foreground">({reviews?.length} evaluaciones)</span>
              </div>
            )}

            {creator.bio && (
              <p className="text-muted-foreground mt-4 max-w-2xl">{creator.bio}</p>
            )}

            {links.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
                {links.map((link: any, index: number) => {
                  const Icon = socialIcons[link.type] || Globe;
                  return (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-background border rounded-full text-sm hover:border-primary transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Intro Video */}
      {embedUrl && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Play className="h-6 w-6" />
            Conóceme
          </h2>
          <div className="aspect-video rounded-xl overflow-hidden bg-muted">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Courses */}
      <div className="mb-12">
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

      {/* Reviews Section */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Evaluaciones</h2>

        {/* Submit Review */}
        {canReview && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">
                {userReview ? 'Actualizar tu evaluación' : 'Deja una evaluación'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Tu puntuación</label>
                  <StarRating value={newRating} onChange={setNewRating} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Comentario (opcional)</label>
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Comparte tu experiencia..."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={() => submitReviewMutation.mutate()}
                  disabled={submitReviewMutation.isPending}
                >
                  {submitReviewMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {userReview ? 'Actualizar' : 'Enviar evaluación'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews List */}
        {reviews && reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review: any) => (
              <Card key={review.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {review.reviewer?.avatar_url ? (
                        <img src={review.reviewer.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{review.reviewer?.name || 'Usuario'}</p>
                        <span className="text-sm text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString('es-CL')}
                        </span>
                      </div>
                      <StarRating value={review.rating} readOnly />
                      {review.comment && (
                        <p className="text-muted-foreground mt-2">{review.comment}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">Aún no hay evaluaciones para este creador.</p>
        )}
      </div>
    </div>
  );
}