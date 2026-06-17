// Generates a Google OAuth authorization URL for the authenticated creator.
// The `state` param is HMAC-signed and contains the user_id + return_to URL,
// so the public callback can trust who is connecting without needing a JWT.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { signState } from '../_shared/google.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;
const SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
].join(' ');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!GOOGLE_CLIENT_ID) return json({ error: 'GOOGLE_OAUTH_CLIENT_ID not configured' }, 500);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error } = await userClient.auth.getClaims(token);
    if (error || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const body = (await req.json().catch(() => ({}))) as { return_to?: string };
    const returnTo = (body.return_to || '').trim();
    // Allow only same-app return URLs (lovable.app subdomains + tunovu.com style)
    if (!/^https?:\/\/[^/]+(\/.*)?$/i.test(returnTo)) {
      return json({ error: 'return_to required and must be absolute URL' }, 400);
    }

    const nonce = crypto.randomUUID();
    const exp = Math.floor(Date.now() / 1000) + 600; // 10 min
    const signedState = await signState(
      { user_id: userId, return_to: returnTo, nonce, exp },
      SUPABASE_SERVICE_ROLE_KEY,
    );

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', SCOPES);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('include_granted_scopes', 'true');
    url.searchParams.set('state', signedState);

    return json({ authorize_url: url.toString() });
  } catch (e) {
    console.error('google-oauth-start error', e);
    return json({ error: 'Unexpected' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
