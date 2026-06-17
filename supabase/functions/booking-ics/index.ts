// Public: returns a .ics file for a booking, validated by ics_token.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    const token = url.searchParams.get('token');
    if (!id || !token) return new Response('missing params', { status: 400 });

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: b } = await admin
      .from('session_bookings')
      .select('id, start_at, end_at, meet_url, ics_token, session_id, creator_id')
      .eq('id', id)
      .maybeSingle();
    if (!b || b.ics_token !== token) return new Response('not found', { status: 404 });

    const { data: s } = await admin
      .from('one_on_one_sessions')
      .select('title, description')
      .eq('id', b.session_id)
      .maybeSingle();

    const ics = buildICS({
      uid: `${b.id}@novu`,
      start: new Date(b.start_at),
      end: new Date(b.end_at),
      summary: s?.title || 'Sesión 1:1',
      description: `${s?.description || ''}${b.meet_url ? `\n\nLink: ${b.meet_url}` : ''}`,
      location: b.meet_url || '',
    });

    return new Response(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="sesion-${b.id}.ics"`,
      },
    });
  } catch (e) {
    console.error('booking-ics', e);
    return new Response('error', { status: 500 });
  }
});

function buildICS(o: { uid: string; start: Date; end: Date; summary: string; description: string; location: string }) {
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NOVU//1:1 Sessions//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${o.uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(o.start)}`,
    `DTEND:${fmt(o.end)}`,
    `SUMMARY:${esc(o.summary)}`,
    `DESCRIPTION:${esc(o.description)}`,
    `LOCATION:${esc(o.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
