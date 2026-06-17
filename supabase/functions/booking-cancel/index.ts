// Cancels a booking (creator or owner user) and deletes the Google event.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getValidAccessToken } from '../_shared/google.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return j({ error: 'unauthorized' }, 401);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return j({ error: 'unauthorized' }, 401);

    const { booking_id } = await req.json();
    if (!booking_id) return j({ error: 'missing_params' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: booking } = await admin
      .from('session_bookings')
      .select('*')
      .eq('id', booking_id)
      .maybeSingle();
    if (!booking) return j({ error: 'not_found' }, 404);
    if (booking.user_id !== userId && booking.creator_id !== userId) return j({ error: 'forbidden' }, 403);
    if (booking.status === 'cancelled') return j({ ok: true });

    // Delete from Google
    if (booking.google_event_id) {
      const tok = await getValidAccessToken(admin, booking.creator_id, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
      if (tok) {
        await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(tok.row.calendar_id || 'primary')}/events/${booking.google_event_id}?sendUpdates=all`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${tok.accessToken}` } },
        ).catch((e) => console.error('google delete event', e));
      }
    }

    await admin
      .from('session_bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', booking.id);

    return j({ ok: true });
  } catch (e) {
    console.error('booking-cancel error', e);
    return j({ error: 'unexpected' }, 500);
  }
});

function j(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
