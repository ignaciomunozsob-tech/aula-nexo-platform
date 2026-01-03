import { Link } from 'react-router-dom';
import { Clock, Users, Star } from 'lucide-react';
import { formatPrice, formatDuration } from '@/lib/utils';

interface CourseCardProps {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  priceCLP: number;
  level: string | null;
  durationMinutes: number | null;
  creatorName: string | null;
  creatorSlug: string | null;
  enrollmentCount?: number;
}

export function CourseCard({
  slug,
  title,
  description,
  coverImageUrl,
  priceCLP,
  level,
  durationMinutes,
  creatorName,
  creatorSlug,
}: CourseCardProps) {
  const levelLabel: Record<string, string> = {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
  };

  return (
    <Link
      to={`/course/${slug}`}
      className="group bg-card rounded-lg border border-border overflow-hidden card-hover"
    >
      {/* Cover Image */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <span className="text-4xl font-bold text-primary/30">{title.charAt(0)}</span>
          </div>
        )}
        {/* Price Badge */}
        <div className="absolute top-3 right-3 bg-background/95 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="font-semibold text-foreground">
            {priceCLP === 0 ? 'Gratis' : formatPrice(priceCLP)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        
        {creatorName && (
          <p className="text-sm text-muted-foreground mt-1">
            por{' '}
            {creatorSlug ? (
              <Link
                to={`/creator/${creatorSlug}`}
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {creatorName}
              </Link>
            ) : (
              creatorName
            )}
          </p>
        )}

        {description && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {description}
          </p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          {level && (
            <span className="px-2 py-1 bg-muted rounded-full">
              {levelLabel[level] || level}
            </span>
          )}
          {durationMinutes && durationMinutes > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(durationMinutes)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
