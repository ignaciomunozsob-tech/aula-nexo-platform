// Creates a 1:1 session booking + a Google Calendar event with Meet link.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getValidAccessToken } from '../_shared/google.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;

interface Body {
  session_id: string;
  start_at: string; // ISO
  guest_email?: string;
  guest_name?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    if (!body?.session_id || !body?.start_at) return j({ error: 'missing_params' }, 400);

    // Identify caller (optional)
    let userId: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
        userId = (claims?.claims?.sub as string) || null;
      } catch { /* guest */ }
    }

    if (!userId && (!body.guest_email || !body.guest_name)) {
      return j({ error: 'guest_info_required' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: sess } = await admin
      .from('one_on_one_sessions')
      .select('id, creator_id, title, description, duration_min, status')
      .eq('id', body.session_id)
      .maybeSingle();
    if (!sess || sess.status !== 'published') return j({ error: 'session_not_found' }, 404);

    const start = new Date(body.start_at);
    if (isNaN(start.getTime())) return j({ error: 'invalid_start' }, 400);
    const end = new Date(start.getTime() + sess.duration_min * 60000);

    // Get attendee email if logged in
    let attendeeEmail = body.guest_email || null;
    let attendeeName = body.guest_name || null;
    if (userId) {
      const { data: u } = await admin.auth.admin.getUserById(userId);
      attendeeEmail = u?.user?.email || attendeeEmail;
      const { data: p } = await admin.from('profiles').select('name').eq('id', userId).maybeSingle();
      attendeeName = p?.name || attendeeName || attendeeEmail;
    }

    // Insert booking (unique index will reject double bookings)
    const { data: booking, error: insErr } = await admin
      .from('session_bookings')
      .insert({
        session_id: sess.id,
        creator_id: sess.creator_id,
        user_id: userId,
        guest_email: userId ? null : attendeeEmail,
        guest_name: userId ? null : attendeeName,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: 'confirmed',
      })
      .select('*')
      .single();
    if (insErr || !booking) {
      console.error('booking insert error', insErr);
      return j({ error: 'slot_unavailable' }, 409);
    }

    // Create Google event with Meet
    let meetUrl: string | null = null;
    let eventId: string | null = null;
    const tok = await getValidAccessToken(admin, sess.creator_id, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    if (tok) {
      try {
        const evRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(tok.row.calendar_id || 'primary')}/events?conferenceDataVersion=1&sendUpdates=all`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${tok.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              summary: `${sess.title} — Sesión 1:1 con ${attendeeName || attendeeEmail}`,
              description: sess.description || '',
              start: { dateTime: start.toISOString() },
              end: { dateTime: end.toISOString() },
              attendees: attendeeEmail ? [{ email: attendeeEmail, displayName: attendeeName || undefined }] : [],
              conferenceData: {
                createRequest: { requestId: booking.id, conferenceSolutionKey: { type: 'hangoutsMeet' } },
              },
              reminders: { useDefault: true },
            }),
          },
        );
        const ev = await evRes.json();
        if (evRes.ok) {
          eventId = ev.id;
          meetUrl = ev.hangoutLink || ev.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === 'video')?.uri || null;
          await admin.from('session_bookings').update({ google_event_id: eventId, meet_url: meetUrl }).eq('id', booking.id);
        } else {
          console.error('google event create failed', ev);
        }
      } catch (e) {
        console.error('google event exception', e);
      }
    }

    return j({
      booking_id: booking.id,
      start_at: booking.start_at,
      end_at: booking.end_at,
      meet_url: meetUrl,
      ics_token: booking.ics_token,
    });
  } catch (e) {
    console.error('booking-create error', e);
    return j({ error: 'unexpected' }, 500);
  }
});

function j(d: unknown, s = 200) {
  return new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
