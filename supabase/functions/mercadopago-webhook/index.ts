// supabase/functions/mercadopago-webhook/index.ts
// Receives MercadoPago notifications, verifies signature, fulfills order
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;
const MP_WEBHOOK_SECRET = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function parseSignatureHeader(header: string | null): { ts?: string; v1?: string } {
  if (!header) return {};
  const parts = header.split(',').map(p => p.trim());
  const out: Record<string, string> = {};
  for (const p of parts) {
    const [k, v] = p.split('=');
    if (k && v) out[k.trim()] = v.trim();
  }
  return { ts: out.ts, v1: out.v1 };
}

async function verifyMpSignature(req: Request, paymentId: string): Promise<boolean> {
  if (!MP_WEBHOOK_SECRET) return false;
  const sigHeader = req.headers.get('x-signature');
  const reqId = req.headers.get('x-request-id') ?? '';
  const { ts, v1 } = parseSignatureHeader(sigHeader);
  if (!ts || !v1 || !reqId) return false;
  // Manifest per MP docs: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
  const manifest = `id:${paymentId};request-id:${reqId};ts:${ts};`;
  const expected = await hmacSha256Hex(MP_WEBHOOK_SECRET, manifest);
  if (expected.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') ?? url.searchParams.get('topic');
    let paymentId = url.searchParams.get('data.id') ?? url.searchParams.get('id');

    if (!paymentId || !type) {
      try {
        const bodyJson = await req.clone().json();
        paymentId = paymentId ?? bodyJson?.data?.id ?? bodyJson?.id ?? null;
      } catch { /* no body */ }
    }

    if (!paymentId) {
      console.log('No payment id in notification');
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    // Verify MercadoPago HMAC signature
    const valid = await verifyMpSignature(req, String(paymentId));
    if (!valid) {
      console.warn('Invalid MercadoPago signature');
      return new Response('forbidden', { status: 403, headers: corsHeaders });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    if (!mpRes.ok) {
      console.error('MP fetch payment failed', mpRes.status);
      return new Response('ok', { status: 200, headers: corsHeaders });
    }
    const payment = await mpRes.json();
    const orderId: string | undefined = payment?.external_reference || payment?.metadata?.order_id;
    if (!orderId) {
      console.error('Payment without order reference');
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: order, error: orderErr } = await admin
      .from('orders').select('*').eq('id', orderId).maybeSingle();
    if (orderErr || !order) {
      console.error('Order not found');
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    const mpStatus: string = payment.status;
    let newStatus: 'pending' | 'paid' | 'failed' | 'refunded' = 'pending';
    if (mpStatus === 'approved') newStatus = 'paid';
    else if (mpStatus === 'refunded') newStatus = 'refunded';
    else if (['rejected', 'cancelled'].includes(mpStatus)) newStatus = 'failed';

    const wasPaidBefore = order.status === 'paid';
    await admin.from('orders').update({
      mp_payment_id: String(payment.id),
      mp_payment_status: mpStatus,
      status: newStatus,
      paid_at: newStatus === 'paid' ? new Date().toISOString() : order.paid_at,
    }).eq('id', order.id);

    if (newStatus === 'paid' && !wasPaidBefore) {
      await fulfillOrder(admin, order);
      if (order.bump_product_type && order.bump_product_id && (order.bump_amount_clp ?? 0) > 0) {
        await fulfillOrder(admin, {
          ...order,
          product_type: order.bump_product_type,
          product_id: order.bump_product_id,
        });
      }
    }

    return new Response('ok', { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error('webhook error', e);
    return new Response('ok', { status: 200, headers: corsHeaders });
  }
});

async function fulfillOrder(admin: ReturnType<typeof createClient>, order: any) {
  const { product_type, product_id, user_id } = order;
  try {
    if (product_type === 'course') {
      await admin.from('enrollments').upsert(
        { user_id, course_id: product_id, status: 'active' },
        { onConflict: 'user_id,course_id', ignoreDuplicates: false }
      );
    } else if (product_type === 'event') {
      await admin.from('event_registrations').upsert(
        { user_id, event_id: product_id, status: 'active' },
        { onConflict: 'user_id,event_id', ignoreDuplicates: false }
      );
    } else if (product_type === 'community') {
      await admin.from('community_members').upsert(
        { user_id, community_id: product_id, role: 'member' },
        { onConflict: 'community_id,user_id', ignoreDuplicates: true }
      );
      await admin.from('community_join_requests').update({ status: 'approved' })
        .eq('user_id', user_id).eq('community_id', product_id);
    }
    // ebook: access is granted via the orders table (paid order)
  } catch (e) {
    console.error('fulfill error', product_type, e);
  }
}

