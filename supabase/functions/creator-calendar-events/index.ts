// Returns creator's NOVU bookings + Google Calendar events in a date range.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getValidAccessToken } from '../_shared/google.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return j({ error: 'unauthorized' }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: uErr } = await userClient.auth.getUser();
    if (uErr || !userRes.user) return j({ error: 'unauthorized' }, 401);
    const userId = userRes.user.id;

    const { from, to } = (await req.json()) as { from: string; to: string };
    if (!from || !to) return j({ error: 'missing_params' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);

    // NOVU bookings for this creator in range
    const { data: bookings } = await admin
      .from('session_bookings')
      .select('id, session_id, start_at, end_at, status, meet_url, guest_name, guest_email, user_id, one_on_one_sessions(title)')
      .eq('creator_id', userId)
      .gte('start_at', from)
      .lte('start_at', to)
      .order('start_at');

    // Google events
    let google_events: Array<{ id: string; title: string; start: string; end: string; html_link?: string }> = [];
    const tok = await getValidAccessToken(admin, userId, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    if (tok) {
      const calId = tok.row.calendar_id || 'primary';
      const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`);
      url.searchParams.set('timeMin', from);
      url.searchParams.set('timeMax', to);
      url.searchParams.set('singleEvents', 'true');
      url.searchParams.set('orderBy', 'startTime');
      url.searchParams.set('maxResults', '250');
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${tok.accessToken}` } });
      if (res.ok) {
        const data = await res.json();
        google_events = (data.items || [])
          .filter((e: any) => e.start?.dateTime && e.end?.dateTime)
          .map((e: any) => ({
            id: e.id,
            title: e.summary || '(sin título)',
            start: e.start.dateTime,
            end: e.end.dateTime,
            html_link: e.htmlLink,
          }));
      }
    }

    return j({ novu_bookings: bookings || [], google_events });
  } catch (e) {
    console.error('creator-calendar-events error', e);
    return j({ error: 'unexpected' }, 500);
  }
});

function j(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
