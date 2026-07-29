import { Video, CalendarDays, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { icsDownloadUrl } from '@/lib/calendar-links';
import type { SessionBooking } from '@/hooks/useStudentLibrary';

const statusLabel: Record<string, string> = {
  confirmed: 'Confirmada',
  pending: 'Pendiente',
  cancelled: 'Cancelada',
};

export function MySessionsList({ bookings }: { bookings: SessionBooking[] }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {bookings.map((b) => {
        const start = new Date(b.start_at);
        const isCancelled = b.status === 'cancelled';
        return (
          <div key={b.id} className="bg-card border border-border rounded-lg p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <Badge variant={isCancelled ? 'destructive' : 'secondary'}>
                {statusLabel[b.status] || b.status}
              </Badge>
            </div>
            <h3 className="font-semibold mt-3 line-clamp-2">{b.session_title}</h3>
            {b.creator_name && (
              <p className="text-sm text-muted-foreground">con {b.creator_name}</p>
            )}
            <p className="text-sm mt-2">
              {start.toLocaleDateString('es-CL', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                timeZone: 'America/Santiago',
              })}
              {' · '}
              {start.toLocaleTimeString('es-CL', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Santiago',
              })}{' '}
              hrs
            </p>
            {!isCancelled && (
              <div className="mt-4 flex flex-col gap-2">
                {b.meet_url && (
                  <Button asChild className="gap-2">
                    <a href={b.meet_url} target="_blank" rel="noopener noreferrer">
                      <Video className="h-4 w-4" />
                      Unirse a la reunión
                    </a>
                  </Button>
                )}
                {b.ics_token && (
                  <Button asChild variant="outline" className="gap-2">
                    <a href={icsDownloadUrl(b.id, b.ics_token)}>
                      <CalendarPlus className="h-4 w-4" />
                      Agregar al calendario
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
