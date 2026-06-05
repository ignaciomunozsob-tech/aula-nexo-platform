// supabase/functions/create-payment/index.ts
// Creates a MercadoPago Checkout Pro preference for a course / ebook / event / community
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

type ProductType = 'course' | 'ebook' | 'event' | 'community';

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!MP_ACCESS_TOKEN) {
      return json({ error: 'MERCADOPAGO_ACCESS_TOKEN not configured' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string) ?? null;

    const body = await req.json().catch(() => null) as
      | { product_type: ProductType; product_id: string; return_url?: string }
      | null;
    if (!body?.product_type || !body?.product_id) {
      return json({ error: 'product_type and product_id required' }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch product info
    let title = '';
    let amount = 0;
    let creatorId: string | null = null;
    let coverUrl: string | null = null;

    if (body.product_type === 'course') {
      const { data, error } = await admin
        .from('courses')
        .select('id, title, price_clp, creator_id, cover_image_url')
        .eq('id', body.product_id).maybeSingle();
      if (error || !data) return json({ error: 'Course not found' }, 404);
      title = data.title; amount = data.price_clp; creatorId = data.creator_id; coverUrl = data.cover_image_url;
    } else if (body.product_type === 'ebook') {
      const { data, error } = await admin
        .from('ebooks')
        .select('id, title, price_clp, creator_id, cover_image_url')
        .eq('id', body.product_id).maybeSingle();
      if (error || !data) return json({ error: 'Ebook not found' }, 404);
      title = data.title; amount = data.price_clp; creatorId = data.creator_id; coverUrl = data.cover_image_url;
    } else if (body.product_type === 'event') {
      const { data, error } = await admin
        .from('events')
        .select('id, title, price_clp, creator_id, cover_image_url')
        .eq('id', body.product_id).maybeSingle();
      if (error || !data) return json({ error: 'Event not found' }, 404);
      title = data.title; amount = data.price_clp; creatorId = data.creator_id; coverUrl = data.cover_image_url;
    } else if (body.product_type === 'community') {
      const { data, error } = await admin
        .from('communities')
        .select('id, name, price_clp, creator_id, cover_url')
        .eq('id', body.product_id).maybeSingle();
      if (error || !data) return json({ error: 'Community not found' }, 404);
      title = data.name; amount = data.price_clp; creatorId = data.creator_id; coverUrl = data.cover_url;
    } else {
      return json({ error: 'Invalid product_type' }, 400);
    }

    if (amount <= 0) return json({ error: 'Producto sin precio configurado' }, 400);

    // 90/10 split (record only — payouts handled externally)
    const creatorAmount = Math.round(amount * 0.9);
    const platformAmount = amount - creatorAmount;

    // Create pending order
    const { data: order, error: orderErr } = await admin.from('orders').insert({
      user_id: userId,
      creator_id: creatorId,
      product_type: body.product_type,
      product_id: body.product_id,
      amount_clp: amount,
      creator_amount_clp: creatorAmount,
      platform_amount_clp: platformAmount,
      status: 'pending',
      metadata: { title },
    }).select().single();
    if (orderErr || !order) {
      return json({ error: 'No se pudo crear la orden', detail: orderErr?.message }, 500);
    }

    // Build MP preference
    const origin = req.headers.get('origin') ?? body.return_url ?? '';
    const returnBase = `${origin}/#/payment`;

    const preferencePayload = {
      items: [{
        id: order.id,
        title: title.slice(0, 250),
        quantity: 1,
        currency_id: 'CLP',
        unit_price: amount,
        picture_url: coverUrl ?? undefined,
      }],
      payer: userEmail ? { email: userEmail } : undefined,
      external_reference: order.id,
      back_urls: {
        success: `${returnBase}/success?order=${order.id}`,
        failure: `${returnBase}/failure?order=${order.id}`,
        pending: `${returnBase}/pending?order=${order.id}`,
      },
      auto_return: 'approved',
      notification_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`,
      metadata: {
        order_id: order.id,
        product_type: body.product_type,
        product_id: body.product_id,
        user_id: userId,
      },
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preferencePayload),
    });
    const mpJson = await mpRes.json();
    if (!mpRes.ok) {
      console.error('MP error', mpRes.status, mpJson);
      await admin.from('orders').update({ status: 'failed', metadata: { ...order.metadata, mp_error: mpJson } }).eq('id', order.id);
      return json({ error: 'MercadoPago error', detail: mpJson }, 502);
    }

    await admin.from('orders').update({ mp_preference_id: mpJson.id }).eq('id', order.id);

    return json({
      order_id: order.id,
      preference_id: mpJson.id,
      init_point: mpJson.init_point,
      sandbox_init_point: mpJson.sandbox_init_point,
    });
  } catch (e) {
    console.error('create-payment unexpected', e);
    return json({ error: 'Unexpected error', detail: String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
