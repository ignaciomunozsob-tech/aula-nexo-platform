// Helpers to build universal "Add to Calendar" links.

const fmtUTC = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function googleCalendarUrl(opts: {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
}) {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: opts.title,
    dates: `${fmtUTC(opts.start)}/${fmtUTC(opts.end)}`,
    details: opts.description || '',
    location: opts.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function icsDownloadUrl(bookingId: string, token: string) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return `${base}/functions/v1/booking-ics?id=${bookingId}&token=${token}`;
}
