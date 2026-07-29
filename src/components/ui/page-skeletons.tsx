import { Skeleton } from '@/components/ui/skeleton';

/** Generic dashboard/list page: title + optional stats + rows */
export function DashboardSkeleton({ stats = 4, rows = 4 }: { stats?: number; rows?: number }) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      {stats > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: stats }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 w-32" />
            </div>
          ))}
        </div>
      )}
      <ListSkeleton rows={rows} />
    </div>
  );
}

/** Simple stacked rows (tables, lists) */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
          <Skeleton className="h-10 w-10 rounded-md shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Card grid (products, courses, ebooks) */
export function CardGridSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Public product detail page (course / event / ebook) */
export function ProductDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10" aria-busy="true">
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="h-8 w-2/3" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="space-y-3 pt-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-11 w-full rounded-md" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Creator public profile */
export function CreatorProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8" aria-busy="true">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <Skeleton className="h-24 w-24 rounded-full shrink-0" />
        <div className="flex-1 space-y-3 w-full">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <CardGridSkeleton items={3} />
    </div>
  );
}

/** Checkout / payment pages */
export function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-background py-10 px-4" aria-busy="true">
      <div className="max-w-4xl mx-auto grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <Skeleton className="h-7 w-48" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-md" />
          ))}
          <Skeleton className="h-12 w-full rounded-md" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4 h-fit">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>
    </div>
  );
}

/** Course player */
export function PlayerSkeleton() {
  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row gap-6 p-4 lg:p-6" aria-busy="true">
      <div className="flex-1 space-y-4">
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
      <div className="w-full lg:w-80 space-y-3">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

/** Full-page fallback for lazily loaded routes */
export function RouteSkeleton() {
  return (
    <div className="max-w-6xl mx-auto w-full px-4 py-10 space-y-6" aria-busy="true">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card overflow-hidden">
            <Skeleton className="aspect-video w-full rounded-none" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
