// Exchanges MercadoPago authorization code for access/refresh tokens and stores them for the creator.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MP_CLIENT_ID = Deno.env.get('MERCADOPAGO_CLIENT_ID')!;
const MP_CLIENT_SECRET = Deno.env.get('MERCADOPAGO_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!MP_CLIENT_ID || !MP_CLIENT_SECRET) return json({ error: 'MP OAuth not configured' }, 500);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error } = await userClient.auth.getClaims(token);
    if (error || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => null) as
      | { code?: string; redirect_uri?: string; state?: string } | null;
    if (!body?.code || !body?.redirect_uri) return json({ error: 'code & redirect_uri required' }, 400);

    // State validation: must match this user (prevents account hijack)
    if (body.state && body.state !== userId) return json({ error: 'Invalid state' }, 400);

    // Exchange code for tokens
    const tokenRes = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: body.code,
        redirect_uri: body.redirect_uri,
      }).toString(),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      console.error('MP oauth error', tokenRes.status, tokenJson);
      console.error('mp oauth rejected', tokenJson); return json({ error: 'MercadoPago rechazó la conexión' }, 400);
    }

    const { access_token, refresh_token, user_id: mp_user_id, public_key, live_mode, expires_in, scope } = tokenJson;
    if (!access_token || !mp_user_id) return json({ error: 'Respuesta MP incompleta', detail: tokenJson }, 400);

    // Optional: fetch MP user details (nickname/email)
    let nickname: string | null = null;
    let mpEmail: string | null = null;
    try {
      const meRes = await fetch('https://api.mercadopago.com/users/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (meRes.ok) {
        const me = await meRes.json();
        nickname = me?.nickname ?? null;
        mpEmail = me?.email ?? null;
      }
    } catch { /* ignore */ }

    const expiresAt = expires_in ? new Date(Date.now() + Number(expires_in) * 1000).toISOString() : null;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: upErr } = await admin.from('creator_mercadopago_accounts').upsert({
      creator_id: userId,
      mp_user_id: String(mp_user_id),
      access_token,
      refresh_token: refresh_token ?? null,
      public_key: public_key ?? null,
      live_mode: !!live_mode,
      scope: scope ?? null,
      nickname,
      email: mpEmail,
      expires_at: expiresAt,
      connected_at: new Date().toISOString(),
    }, { onConflict: 'creator_id' });
    if (upErr) {
      console.error('upsert mp account error', upErr);
      console.error('mp oauth save error', upErr); return json({ error: 'No se pudo guardar la conexión' }, 500);
    }

    return json({ ok: true, nickname, mp_user_id: String(mp_user_id), live_mode: !!live_mode });
  } catch (e) {
    console.error('oauth-callback unexpected', e);
    return json({ error: 'Unexpected' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
