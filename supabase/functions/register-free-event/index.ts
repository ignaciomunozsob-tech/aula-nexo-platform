// Free event registration: no MercadoPago. Registers the user (or a guest by email),
// sends the confirmation email, and returns an optional redirect_url.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null) as { event_id?: string; guest_email?: string; guest_name?: string; guest_phone?: string } | null;
    if (!body?.event_id) return json({ error: 'event_id required' }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve caller
    let userId: string | null = null;
    let userEmail: string | null = null;
    let userName = '';
    let isNewUser = false;
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      if (token && token !== SUPABASE_ANON_KEY) {
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: claims } = await userClient.auth.getClaims(token);
        if (claims?.claims?.sub) {
          userId = claims.claims.sub as string;
          userEmail = (claims.claims.email as string) ?? null;
        }
      }
    }

    if (!userId) {
      const guestEmail = (body.guest_email ?? '').trim().toLowerCase();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail) && guestEmail.length <= 254;
      if (!emailOk) return json({ error: 'Email inválido o no proporcionado' }, 400);

      const { data: existingId } = await admin.rpc('find_user_id_by_email', { _email: guestEmail });
      if (existingId) {
        userId = existingId as string;
        userEmail = guestEmail;
      } else {
        const randomPwd = crypto.randomUUID() + crypto.randomUUID();
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: guestEmail,
          password: randomPwd,
          email_confirm: true,
          user_metadata: { name: body.guest_name || guestEmail.split('@')[0], created_via: 'free_event' },
        });
        if (createErr || !created?.user) {
          console.error('register-free-event create user error', createErr);
          return json({ error: 'No se pudo crear el usuario' }, 500);
        }
        userId = created.user.id;
        userEmail = guestEmail;
        isNewUser = true;
      }
    }

    if (userId) {
      const { data: prof } = await admin.from('profiles').select('name').eq('id', userId).maybeSingle();
      userName = prof?.name ?? '';
    }

    // Load event
    const { data: ev, error: evErr } = await admin.from('events')
      .select('id, title, price_clp, status, max_attendees, event_date, duration_minutes, event_type, location, meeting_url, redirect_url, creator_id')
      .eq('id', body.event_id).maybeSingle();
    if (evErr || !ev) return json({ error: 'Evento no encontrado' }, 404);
    if (ev.status !== 'published') return json({ error: 'Evento no disponible' }, 400);
    if ((ev.price_clp ?? 0) > 0) return json({ error: 'Este evento requiere pago' }, 400);

    if (ev.max_attendees && ev.max_attendees > 0) {
      const { count } = await admin.from('event_registrations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', ev.id).eq('status', 'active');
      if ((count ?? 0) >= ev.max_attendees) {
        return json({ error: 'El evento está lleno' }, 409);
      }
    }

    // Register (idempotent)
    const { error: regErr } = await admin.from('event_registrations').upsert(
      { user_id: userId, event_id: ev.id, status: 'active' },
      { onConflict: 'user_id,event_id', ignoreDuplicates: false },
    );
    if (regErr) {
      console.error('register-free-event upsert error', regErr);
      return json({ error: 'No se pudo inscribir' }, 500);
    }

    // Send confirmation (idempotent by user+event)
    try {
      let creatorName = '';
      if (ev.creator_id) {
        const { data: cp } = await admin.from('profiles').select('name').eq('id', ev.creator_id).maybeSingle();
        creatorName = cp?.name ?? '';
      }
      const d = ev.event_date ? new Date(ev.event_date) : null;
      const dateFmt = d ? d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago' }) : '';
      const timeFmt = d ? d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' }) + ' hrs' : '';
      if (userEmail) {
        await admin.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'event-registration-confirmation',
            recipientEmail: userEmail,
            idempotencyKey: `evt-reg-free-${ev.id}-${userId}`,
            templateData: {
              attendeeName: userName,
              eventTitle: ev.title,
              eventDateFormatted: dateFmt,
              eventTimeFormatted: timeFmt,
              durationMin: ev.duration_minutes ?? 60,
              eventType: ev.event_type === 'in_person' ? 'in_person' : 'online',
              meetingUrl: ev.meeting_url ?? '',
              location: ev.location ?? '',
              creatorName,
              redirectUrl: ev.redirect_url ?? '',
            },
          },
        });
      }
    } catch (e) {
      console.warn('free event confirmation email error', e);
    }

    return json({ ok: true, redirect_url: ev.redirect_url ?? null });
  } catch (e) {
    console.error('register-free-event unexpected', e);
    return json({ error: 'Unexpected error' }, 500);
  }
});
