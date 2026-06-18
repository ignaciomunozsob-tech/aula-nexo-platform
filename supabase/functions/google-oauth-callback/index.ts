// Public redirect target from Google OAuth. Verifies the signed state, exchanges
// the code for tokens, upserts the creator_google_accounts row, then 302s back
// to the original frontend URL with a status query param.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { exchangeCode, parseIdToken, verifyState } from '../_shared/google.ts';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/google-oauth-callback`;

const FALLBACK_RETURN = 'https://soynovu.cl/creator-app/integrations?google=error';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  // Try to extract a return_to from the state even on error
  let returnTo: string | null = null;
  if (stateParam) {
    const parsed = await verifyState(stateParam, SUPABASE_SERVICE_ROLE_KEY).catch(() => null);
    if (parsed) returnTo = parsed.return_to;
  }

  if (errorParam) {
    return redirectWith(returnTo, 'error', errorParam);
  }
  if (!code || !stateParam) {
    return redirectWith(returnTo, 'error', 'missing_params');
  }

  const state = await verifyState(stateParam, SUPABASE_SERVICE_ROLE_KEY).catch(() => null);
  if (!state) {
    return redirectWith(null, 'error', 'invalid_state');
  }

  try {
    const tokens = await exchangeCode({
      code,
      redirect_uri: REDIRECT_URI,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    });

    if (!tokens.refresh_token) {
      console.error('google callback: no refresh_token returned');
      return redirectWith(state.return_to, 'error', 'no_refresh_token');
    }

    const claims = tokens.id_token ? parseIdToken(tokens.id_token) : {};
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: upErr } = await admin.from('creator_google_accounts').upsert({
      creator_id: state.user_id,
      google_sub: claims.sub || 'unknown',
      google_email: claims.email || null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope || null,
      calendar_id: 'primary',
      connected_at: new Date().toISOString(),
    }, { onConflict: 'creator_id' });

    if (upErr) {
      console.error('google callback upsert error', upErr);
      return redirectWith(state.return_to, 'error', 'save_failed');
    }

    return redirectWith(state.return_to, 'connected');
  } catch (e) {
    console.error('google-oauth-callback unexpected', e);
    return redirectWith(state.return_to, 'error', 'exchange_failed');
  }
});

function redirectWith(returnTo: string | null, status: string, detail?: string): Response {
  const base = returnTo || FALLBACK_RETURN;
  // Append query without breaking existing hash fragment URLs
  const sep = base.includes('?') ? '&' : (base.includes('#') ? (base.includes('?') ? '&' : '?') : '?');
  // For hash router URLs like .../creator/integrations, we want query INSIDE the hash
  let target = base;
  if (base.includes('#') && !base.split('#')[1]?.includes('?')) {
    target = `${base}?google=${status}${detail ? `&detail=${encodeURIComponent(detail)}` : ''}`;
  } else {
    target = `${base}${sep}google=${status}${detail ? `&detail=${encodeURIComponent(detail)}` : ''}`;
  }
  return new Response(null, { status: 302, headers: { Location: target } });
}
