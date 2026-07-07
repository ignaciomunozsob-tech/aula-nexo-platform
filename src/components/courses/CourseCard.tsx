import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { formatPrice, formatDuration, getCourseUrl } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitize';

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
      to={getCourseUrl(creatorSlug, slug)}
      className="group bg-card rounded-lg border border-border overflow-hidden card-hover flex flex-col"
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
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
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
          <div
            className="text-sm text-muted-foreground mt-2 line-clamp-2 rich-text-preview"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(description) }}
          />
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
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

        {/* Price + CTA */}
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-border/50">
          <span className="font-semibold text-foreground">
            {priceCLP === 0 ? 'Gratis' : formatPrice(priceCLP)}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium group-hover:bg-primary/90 transition-colors">
            Conocer más
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
