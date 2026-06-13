// Generates the MercadoPago authorization URL for a creator to connect their MP account.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MP_CLIENT_ID = Deno.env.get('MERCADOPAGO_CLIENT_ID')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!MP_CLIENT_ID) return json({ error: 'MERCADOPAGO_CLIENT_ID not configured' }, 500);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error } = await userClient.auth.getClaims(token);
    if (error || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({})) as { redirect_uri?: string };
    const redirectUri = body.redirect_uri;
    if (!redirectUri) return json({ error: 'redirect_uri required' }, 400);

    // state = userId so callback knows which creator is connecting
    const url = new URL('https://auth.mercadopago.com/authorization');
    url.searchParams.set('client_id', MP_CLIENT_ID);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('platform_id', 'mp');
    url.searchParams.set('state', userId);
    url.searchParams.set('redirect_uri', redirectUri);

    return json({ authorize_url: url.toString() });
  } catch (e) {
    return json({ error: 'Unexpected', detail: String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
