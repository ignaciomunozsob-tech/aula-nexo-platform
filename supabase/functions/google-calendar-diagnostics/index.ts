import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getValidAccessToken } from '../_shared/google.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return j({ ok: false, status: 'unauthorized', message: 'Debes iniciar sesión.' }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) return j({ ok: false, status: 'unauthorized', message: 'Debes iniciar sesión.' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: account } = await admin
      .from('creator_google_accounts')
      .select('scope')
      .eq('creator_id', userRes.user.id)
      .maybeSingle();

    if (!account) {
      return j({ ok: false, status: 'no_connection', message: 'Google Calendar no está conectado.' });
    }

    const granted = new Set(String(account.scope || '').split(' ').filter(Boolean));
    const missing = REQUIRED_SCOPES.filter((scope) => !granted.has(scope));
    if (missing.length > 0) {
      return j({
        ok: false,
        status: 'missing_scopes',
        missing_scopes: missing,
        message: 'Faltan permisos de Google Calendar. Desconecta y vuelve a conectar Google Calendar aceptando los nuevos permisos.',
      });
    }

    const tok = await getValidAccessToken(admin, userRes.user.id, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
    if (!tok) {
      return j({ ok: false, status: 'no_connection', message: 'Google Calendar no está conectado.' });
    }

    const listRes = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&maxResults=10',
      { headers: { Authorization: `Bearer ${tok.accessToken}` } },
    );
    const listJson = await listRes.json();
    if (!listRes.ok) {
      const status = classifyGoogleError(listJson);
      return j({ ok: false, status, message: messageForGoogleStatus(status), details: listJson });
    }

    const calendarIds = Array.isArray(listJson.items)
      ? listJson.items.filter((c: any) => c.selected !== false).map((c: any) => c.id).filter(Boolean).slice(0, 10)
      : [];
    const fbRes = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok.accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeMin: new Date().toISOString(),
        timeMax: new Date(Date.now() + 86400000).toISOString(),
        items: (calendarIds.length ? calendarIds : ['primary']).map((id: string) => ({ id })),
      }),
    });
    const fbJson = await fbRes.json();
    if (!fbRes.ok) {
      const status = classifyGoogleError(fbJson);
      return j({ ok: false, status, message: messageForGoogleStatus(status), details: fbJson });
    }

    return j({ ok: true, status: 'ok', calendars_checked: calendarIds.length || 1 });
  } catch (e) {
    console.error('google-calendar-diagnostics error', e);
    return j({ ok: false, status: 'unexpected', message: 'No se pudo validar Google Calendar.' }, 500);
  }
});

function classifyGoogleError(payload: any): string {
  const raw = JSON.stringify(payload || {});
  if (raw.includes('SERVICE_DISABLED') || raw.includes('accessNotConfigured')) return 'calendar_api_disabled';
  if (raw.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') || raw.includes('insufficientPermissions')) return 'missing_scopes';
  return 'google_error';
}

function messageForGoogleStatus(status: string): string {
  if (status === 'calendar_api_disabled') {
    return 'La Google Calendar API está desactivada en el proyecto de Google usado por NOVU. Debe activarse en Google Cloud para que NOVU pueda leer disponibilidad y crear eventos.';
  }
  if (status === 'missing_scopes') {
    return 'Faltan permisos de Google Calendar. Desconecta y vuelve a conectar Google Calendar aceptando los nuevos permisos.';
  }
  return 'Google rechazó la conexión de Calendar. Revisa la configuración de OAuth y vuelve a conectar.';
}

function j(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}