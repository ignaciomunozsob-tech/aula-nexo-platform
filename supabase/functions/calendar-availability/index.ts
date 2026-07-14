// Public: returns available slots for a 1:1 session within [from_date, to_date].
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getValidAccessToken } from '../_shared/google.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;

interface Body { session_id: string; from_date: string; to_date: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    if (!body?.session_id || !body?.from_date || !body?.to_date) return j({ error: 'missing_params' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: sess, error: sessErr } = await admin
      .from('one_on_one_sessions')
      .select('id, creator_id, duration_min, status, timezone, buffer_before_min, buffer_after_min, min_notice_hours, max_days_ahead')
      .eq('id', body.session_id)
      .maybeSingle();
    if (sessErr || !sess || sess.status !== 'published') return j({ error: 'session_not_found' }, 404);

    const tz = sess.timezone || 'America/Santiago';
    const duration = sess.duration_min;
    const bufBefore = sess.buffer_before_min ?? 0;
    const bufAfter = sess.buffer_after_min ?? 0;
    const minNoticeMs = (sess.min_notice_hours ?? 12) * 3600 * 1000;
    const maxDays = sess.max_days_ahead ?? 30;

    // Per-service rules first; fallback to creator-global rules if none.
    let { data: rules } = await admin
      .from('session_availability_rules')
      .select('day_of_week, start_time, end_time')
      .eq('session_id', sess.id);
    if (!rules || rules.length === 0) {
      const r = await admin
        .from('creator_availability_rules')
        .select('day_of_week, start_time, end_time')
        .eq('creator_id', sess.creator_id);
      rules = r.data || [];
    }

    const from = new Date(body.from_date + 'T00:00:00Z');
    const toCap = new Date(Date.now() + maxDays * 86400000);
    const to = new Date(Math.min(new Date(body.to_date + 'T23:59:59Z').getTime(), toCap.getTime()));

    // Existing NOVU bookings in range
    const { data: existing } = await admin
      .from('session_bookings')
      .select('start_at, end_at')
      .eq('creator_id', sess.creator_id)
      .eq('status', 'confirmed')
      .gte('start_at', from.toISOString())
      .lte('start_at', to.toISOString());

    // Google freebusy — query ALL calendars the creator has selected in Google,
    // not just `primary`, so blocks on secondary calendars are respected.
    let busy: Array<{ start: string; end: string }> = [];
    let google_status = 'no_connection';
    const tok = await getValidAccessToken(admin, sess.creator_id, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    if (tok) {
      google_status = 'checking';
      // 1) list calendars
      let calendarIds: string[] = [tok.row.calendar_id || 'primary'];
      try {
        const listRes = await fetch(
          'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&maxResults=250',
          { headers: { Authorization: `Bearer ${tok.accessToken}` } },
        );
        const listJson = await listRes.json();
        if (listRes.ok && Array.isArray(listJson.items)) {
          const ids = listJson.items
            .filter((c: any) => c.selected !== false)
            .map((c: any) => c.id)
            .filter(Boolean);
          if (ids.length > 0) calendarIds = ids.slice(0, 50); // freeBusy hard cap
        } else {
          google_status = classifyGoogleError(listJson);
          console.warn('calendarList failed, falling back to primary', listJson);
        }
      } catch (e) {
        console.warn('calendarList exception, falling back to primary', e);
      }

      const fbRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeMin: from.toISOString(),
          timeMax: to.toISOString(),
          timeZone: tz,
          items: calendarIds.map((id) => ({ id })),
        }),
      });
      const fb = await fbRes.json();
      if (fbRes.ok && fb?.calendars) {
        for (const id of calendarIds) {
          const cal = fb.calendars[id];
          if (cal?.busy && Array.isArray(cal.busy)) busy.push(...cal.busy);
        }
        if (google_status === 'checking') google_status = 'ok';
        console.log('freeBusy ok', { calendars: calendarIds.length, busyBlocks: busy.length });
      } else {
        google_status = classifyGoogleError(fb);
        console.error('freeBusy failed', fb);
      }
    } else {
      console.warn('calendar-availability: creator has no Google connection, availability will not reflect Google blocks', { creator_id: sess.creator_id });
    }

    // Build slots day by day in creator timezone
    const slots: string[] = [];
    const now = Date.now();
    const rulesByDow: Record<number, Array<{ s: string; e: string }>> = {};
    (rules || []).forEach((r: any) => {
      (rulesByDow[r.day_of_week] ||= []).push({ s: r.start_time, e: r.end_time });
    });

    // Iterate day cursor in UTC but interpret day-of-week in tz
    for (let d = new Date(from); d <= to; d = new Date(d.getTime() + 86400000)) {
      const dateInTz = formatInTz(d, tz); // YYYY-MM-DD
      const dow = dayOfWeekInTz(d, tz);
      const blocks = rulesByDow[dow] || [];
      for (const block of blocks) {
        // Build slot times in tz
        const [sh, sm] = block.s.split(':').map(Number);
        const [eh, em] = block.e.split(':').map(Number);
        let cursor = tzDateTime(dateInTz, sh, sm, tz);
        const endBlock = tzDateTime(dateInTz, eh, em, tz);
        while (cursor.getTime() + duration * 60000 <= endBlock.getTime()) {
          const start = cursor;
          const end = new Date(cursor.getTime() + duration * 60000);
          const startBuf = new Date(start.getTime() - bufBefore * 60000);
          const endBuf = new Date(end.getTime() + bufAfter * 60000);
          if (start.getTime() - now >= minNoticeMs) {
            const conflictNovu = (existing || []).some((b: any) =>
              overlaps(startBuf, endBuf, new Date(b.start_at), new Date(b.end_at)),
            );
            const conflictG = busy.some((b) => overlaps(startBuf, endBuf, new Date(b.start), new Date(b.end)));
            if (!conflictNovu && !conflictG) slots.push(start.toISOString());
          }
          cursor = new Date(cursor.getTime() + duration * 60000);
        }
      }
    }

    return j({ slots, duration_min: duration, timezone: tz, google_status });
  } catch (e) {
    console.error('calendar-availability error', e);
    return j({ error: 'unexpected' }, 500);
  }
});

function overlaps(a1: Date, a2: Date, b1: Date, b2: Date) {
  return a1 < b2 && b1 < a2;
}

function formatInTz(d: Date, tz: string): string {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  return f.format(d); // YYYY-MM-DD
}

function dayOfWeekInTz(d: Date, tz: string): number {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
  const w = f.format(d);
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[w as any] ?? 0;
}

/** Returns a UTC Date that represents (dateStr HH:MM) in the given timezone. */
function tzDateTime(dateStr: string, hour: number, minute: number, tz: string): Date {
  // Build a Date assuming UTC then adjust for tz offset at that instant.
  const guess = new Date(`${dateStr}T${pad(hour)}:${pad(minute)}:00Z`);
  const offsetMin = tzOffsetMinutes(guess, tz);
  return new Date(guess.getTime() - offsetMin * 60000);
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function tzOffsetMinutes(d: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(d).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    +parts.year, +parts.month - 1, +parts.day,
    +parts.hour, +parts.minute, +parts.second,
  );
  return (asUTC - d.getTime()) / 60000;
}

function j(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function classifyGoogleError(payload: any): string {
  const raw = JSON.stringify(payload || {});
  if (raw.includes('SERVICE_DISABLED') || raw.includes('accessNotConfigured')) return 'calendar_api_disabled';
  if (raw.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') || raw.includes('insufficientPermissions')) return 'missing_scopes';
  return 'google_error';
}
