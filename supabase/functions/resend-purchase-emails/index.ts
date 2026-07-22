// supabase/functions/resend-purchase-emails/index.ts
// Admin-only endpoint that re-runs the post-purchase email flow for a given
// order (by id or reference). Used to backfill sends for orders where the
// original MercadoPago webhook did not deliver emails.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { sendPurchaseEmails } from '../_shared/purchase-emails.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // Auth: allow admin JWT, service-role bearer, or a matching shared internal secret.
    const authHeader = req.headers.get('Authorization') ?? '';
    const internalSecret = req.headers.get('x-internal-secret') ?? '';
    const MP_WEBHOOK_SECRET = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET') ?? '';
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const isInternal = MP_WEBHOOK_SECRET.length > 0 && internalSecret === MP_WEBHOOK_SECRET;
    const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const isServiceRole = jwt.length > 0 && jwt === SUPABASE_SERVICE_ROLE_KEY;

    if (!isInternal && !isServiceRole) {
      if (!jwt) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      });
      const { data: userRes } = await userClient.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: roleRow } = await admin
        .from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
      if (!roleRow) {
        return new Response(JSON.stringify({ error: 'forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }



    const body = await req.json().catch(() => ({}));
    const orderId: string | undefined = body?.order_id;
    const reference: string | undefined = body?.reference;
    const backfillAll: boolean = !!body?.backfill_all;

    if (backfillAll) {
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
          results.push({ reference: o.reference, ...r });
        } catch (e) {
          results.push({ reference: o.reference, error: String(e) });
        }
      }
      return new Response(JSON.stringify({ processed: results.length, results }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let orderQuery = admin.from('orders').select('*').limit(1);
    if (orderId) orderQuery = orderQuery.eq('id', orderId);
    else if (reference) orderQuery = orderQuery.eq('reference', reference);
    else {
      return new Response(JSON.stringify({ error: 'order_id, reference or backfill_all required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: order } = await orderQuery.maybeSingle();
    if (!order) {
      return new Response(JSON.stringify({ error: 'order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (order.status !== 'paid') {
      return new Response(JSON.stringify({ error: 'order not paid' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await sendPurchaseEmails(admin, order);
    return new Response(JSON.stringify({ reference: order.reference, ...result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('resend-purchase-emails error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
