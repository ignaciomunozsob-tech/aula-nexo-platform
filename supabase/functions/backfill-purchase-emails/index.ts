// One-off backfill: reruns purchase emails for recent paid orders missing sends.
// Deployed temporarily; delete after use.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { sendPurchaseEmails } from '../_shared/purchase-emails.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: orders } = await admin
    .from('orders').select('*')
    .eq('status', 'paid')
    .or('buyer_email_sent.eq.false,admin_email_sent.eq.false,creator_email_sent.eq.false')
    .order('created_at', { ascending: false })
    .limit(200);
  const results: any[] = [];
  for (const o of orders ?? []) {
    try {
      const r = await sendPurchaseEmails(admin, o);
      results.push({ ref: o.reference, ...r });
    } catch (e) {
      results.push({ ref: o.reference, error: String(e) });
    }
  }
  return new Response(JSON.stringify({ count: results.length, results }, null, 2), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
