import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Star, User, MessageSquare } from 'lucide-react';

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
        />
      ))}
    </div>
  );
}

export default function CreatorReviewsPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['creator-all-reviews', user?.id],
    queryFn: async () => {
      const { data: reviews, error } = await supabase
        .from('creator_reviews')
        .select('*, reviewer:reviewer_id(name, avatar_url)')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Calculate stats
      const total = reviews?.length || 0;
      const avgRating = total > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total)
        : 0;

      const distribution = [0, 0, 0, 0, 0];
      reviews?.forEach((r) => {
        distribution[r.rating - 1]++;
      });

      return { reviews, total, avgRating, distribution };
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Evaluaciones</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Promedio
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold flex items-center gap-2">
              {data?.avgRating.toFixed(1) || '0.0'}
              <Star className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Evaluaciones
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Distribución
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((stars) => {
                const count = data?.distribution[stars - 1] || 0;
                const percentage = data?.total ? (count / data.total) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-2 text-sm">
                    <span className="w-3">{stars}</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-muted-foreground">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Todas las evaluaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.reviews && data.reviews.length > 0 ? (
            <div className="space-y-6">
              {data.reviews.map((review: any) => (
                <div key={review.id} className="flex items-start gap-4 pb-6 border-b last:border-0 last:pb-0">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {review.reviewer?.avatar_url ? (
                      <img src={review.reviewer.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-medium truncate">{review.reviewer?.name || 'Usuario'}</p>
                      <span className="text-sm text-muted-foreground flex-shrink-0">
                        {new Date(review.created_at).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                    <StarRating value={review.rating} />
                    {review.comment && (
                      <p className="text-muted-foreground mt-2">{review.comment}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Aún no tienes evaluaciones. Las evaluaciones aparecerán aquí cuando los usuarios evalúen tu perfil.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}