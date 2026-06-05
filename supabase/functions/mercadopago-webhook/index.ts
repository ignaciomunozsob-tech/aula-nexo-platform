// supabase/functions/mercadopago-webhook/index.ts
// Receives MercadoPago notifications, verifies payment, fulfills order
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    // MP sends notifications with ?type=payment&data.id=123 (or topic)
    const type = url.searchParams.get('type') ?? url.searchParams.get('topic');
    let paymentId = url.searchParams.get('data.id') ?? url.searchParams.get('id');

    // Body may also contain { type, data: { id } }
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

    // Always acknowledge MP quickly (any non-2xx triggers retries)
    // Fetch payment details from MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${MP_ACCESS_TOKEN}` },
    });
    if (!mpRes.ok) {
      console.error('MP fetch payment failed', mpRes.status, await mpRes.text());
      return new Response('ok', { status: 200, headers: corsHeaders });
    }
    const payment = await mpRes.json();
    const orderId: string | undefined = payment?.external_reference || payment?.metadata?.order_id;
    if (!orderId) {
      console.error('Payment without order reference', payment?.id);
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: order, error: orderErr } = await admin
      .from('orders').select('*').eq('id', orderId).maybeSingle();
    if (orderErr || !order) {
      console.error('Order not found', orderId);
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    const mpStatus: string = payment.status; // approved | rejected | pending | refunded | cancelled
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

    // Fulfill ONLY on first paid transition
    if (newStatus === 'paid' && !wasPaidBefore) {
      await fulfillOrder(admin, order);
    }

    return new Response('ok', { status: 200, headers: corsHeaders });
  } catch (e) {
    console.error('webhook error', e);
    // Still return 200 to avoid endless retries on unexpected errors
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
    // For ebooks, access is granted via get_ebook_file_url checking orders.status='paid'
  } catch (e) {
    console.error('fulfill error', product_type, e);
  }
}
