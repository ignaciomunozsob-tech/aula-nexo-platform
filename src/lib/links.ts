import { MessageCircle, Send, Video, Link2, Youtube, Instagram } from 'lucide-react';

export type LinkKind = 'whatsapp' | 'telegram' | 'zoom' | 'meet' | 'youtube' | 'instagram' | 'generic';

export type LinkInfo = {
  kind: LinkKind;
  label: string;
  icon: typeof Link2;
};

/** Detects the destination of an external link so we can label it for the user. */
export function detectLink(url: string | null | undefined): LinkInfo {
  const u = (url ?? '').toLowerCase();
  if (u.includes('wa.me') || u.includes('whatsapp.com') || u.includes('chat.whatsapp')) {
    return { kind: 'whatsapp', label: 'Unirse al grupo de WhatsApp', icon: MessageCircle };
  }
  if (u.includes('t.me') || u.includes('telegram')) {
    return { kind: 'telegram', label: 'Unirse al canal de Telegram', icon: Send };
  }
  if (u.includes('zoom.us')) {
    return { kind: 'zoom', label: 'Entrar por Zoom', icon: Video };
  }
  if (u.includes('meet.google.com')) {
    return { kind: 'meet', label: 'Entrar por Google Meet', icon: Video };
  }
  if (u.includes('youtube.com') || u.includes('youtu.be')) {
    return { kind: 'youtube', label: 'Ver en YouTube', icon: Youtube };
  }
  if (u.includes('instagram.com')) {
    return { kind: 'instagram', label: 'Ir a Instagram', icon: Instagram };
  }
  return { kind: 'generic', label: 'Ir al enlace del evento', icon: Link2 };
}

/** Builds a Google Calendar "add event" URL. */
export function googleCalendarUrl(opts: {
  title: string;
  start: Date;
  end: Date;
  details?: string | null;
  location?: string | null;
}): string {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${fmt(opts.start)}/${fmt(opts.end)}`,
  });
  if (opts.details) params.set('details', opts.details);
  if (opts.location) params.set('location', opts.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
