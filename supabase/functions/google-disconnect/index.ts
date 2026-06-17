// Revokes the creator's Google tokens at Google and deletes the local row.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { revokeToken } from '../_shared/google.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error } = await userClient.auth.getClaims(token);
    if (error || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: row } = await admin
      .from('creator_google_accounts')
      .select('refresh_token, access_token')
      .eq('creator_id', userId)
      .maybeSingle();

    if (row?.refresh_token) await revokeToken(row.refresh_token);

    const { error: delErr } = await admin
      .from('creator_google_accounts')
      .delete()
      .eq('creator_id', userId);
    if (delErr) {
      console.error('google-disconnect delete error', delErr);
      return json({ error: 'No se pudo desconectar' }, 500);
    }
    return json({ ok: true });
  } catch (e) {
    console.error('google-disconnect unexpected', e);
    return json({ error: 'Unexpected' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
