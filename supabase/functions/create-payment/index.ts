// supabase/functions/create-payment/index.ts
// Creates a MercadoPago Checkout Pro preference for a product (+ optional order bump)
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

type ProductType = 'course' | 'ebook' | 'event' | 'community';

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function fetchProduct(admin: any, type: ProductType, id: string) {
  if (type === 'course') {
    const { data } = await admin.from('courses')
      .select('id, title, price_clp, creator_id, cover_image_url').eq('id', id).maybeSingle();
    return data ? { title: data.title, amount: data.price_clp, creator_id: data.creator_id, cover: data.cover_image_url } : null;
  }
  if (type === 'ebook') {
    const { data } = await admin.from('ebooks')
      .select('id, title, price_clp, creator_id, cover_image_url').eq('id', id).maybeSingle();
    return data ? { title: data.title, amount: data.price_clp, creator_id: data.creator_id, cover: data.cover_image_url } : null;
  }
  if (type === 'event') {
    const { data } = await admin.from('events')
      .select('id, title, price_clp, creator_id, cover_image_url').eq('id', id).maybeSingle();
    return data ? { title: data.title, amount: data.price_clp, creator_id: data.creator_id, cover: data.cover_image_url } : null;
  }
  if (type === 'community') {
    const { data } = await admin.from('communities')
      .select('id, name, price_clp, creator_id, cover_url').eq('id', id).maybeSingle();
    return data ? { title: data.name, amount: data.price_clp, creator_id: data.creator_id, cover: data.cover_url } : null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // MP access token now comes from the creator's connected MercadoPago account (marketplace).

    const body = await req.json().catch(() => null) as
      | { product_type: ProductType; product_id: string; checkout_page_id?: string; include_bump?: boolean; return_url?: string; guest_email?: string }
      | null;
    if (!body?.product_type || !body?.product_id) return json({ error: 'product_type and product_id required' }, 400);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve user: authenticated, or guest by email
    let userId: string | null = null;
    let userEmail: string | null = null;
    let isNewUser = false;

    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      if (token && token !== SUPABASE_ANON_KEY) {
        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: claims } = await userClient.auth.getClaims(token);
        if (claims?.claims?.sub) {
          userId = claims.claims.sub as string;
          userEmail = (claims.claims.email as string) ?? null;
        }
      }
    }

    if (!userId) {
      // Guest flow
      const guestEmail = (body.guest_email ?? '').trim().toLowerCase();
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail) && guestEmail.length <= 254;
      if (!emailOk) return json({ error: 'Email inválido o no proporcionado' }, 400);

      const { data: existingId } = await admin.rpc('find_user_id_by_email', { _email: guestEmail });
      if (existingId) {
        userId = existingId as string;
        userEmail = guestEmail;
      } else {
        const randomPwd = crypto.randomUUID() + crypto.randomUUID();
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: guestEmail,
          password: randomPwd,
          email_confirm: true,
          user_metadata: { name: guestEmail.split('@')[0], created_via: 'guest_checkout' },
        });
        if (createErr || !created?.user) console.error('create-payment user create error', createErr); return json({ error: 'No se pudo crear el usuario' }, 500);
        userId = created.user.id;
        userEmail = guestEmail;
        isNewUser = true;
      }
    }


    const main = await fetchProduct(admin, body.product_type, body.product_id);
    if (!main) return json({ error: 'Product not found' }, 404);
    if (main.amount <= 0) return json({ error: 'Producto sin precio configurado' }, 400);

    // Optional order bump via checkout_page
    let bumpInfo: { type: ProductType; id: string; amount: number; title: string; cover: string | null } | null = null;
    if (body.checkout_page_id && body.include_bump) {
      const { data: page } = await admin.from('checkout_pages')
        .select('id, creator_id, bump_enabled, bump_product_type, bump_product_id, bump_discount_pct')
        .eq('id', body.checkout_page_id).maybeSingle();
      if (page?.bump_enabled && page.bump_product_type && page.bump_product_id) {
        const bp = await fetchProduct(admin, page.bump_product_type as ProductType, page.bump_product_id);
        if (bp && bp.amount > 0) {
          const discount = Math.max(0, Math.min(90, page.bump_discount_pct ?? 0));
          const final = Math.round(bp.amount * (100 - discount) / 100);
          bumpInfo = { type: page.bump_product_type as ProductType, id: page.bump_product_id, amount: final, title: bp.title, cover: bp.cover };
        }
      }
    }

    const totalAmount = main.amount + (bumpInfo?.amount ?? 0);

    // Resolve the creator's current plan commission (defaults to 10% if no row).
    let comisionPct = 10;
    {
      const { data: planRow } = await admin
        .from('creator_plans')
        .select('comision, plan_vence')
        .eq('creator_id', main.creator_id)
        .maybeSingle();
      if (planRow && typeof planRow.comision === 'number') {
        const notExpired = !planRow.plan_vence || new Date(planRow.plan_vence as any) > new Date();
        if (notExpired) comisionPct = Math.max(0, Math.min(100, planRow.comision));
      }
    }
    const platformAmount = Math.round(totalAmount * comisionPct / 100);
    const creatorAmount = totalAmount - platformAmount;

    // Marketplace: use the creator's MercadoPago access token + take 10% as marketplace_fee.
    // Falls back to NOVU's own MP token only if marketplace is not configured for this creator.
    const { data: mpAccount } = await admin
      .from('creator_mercadopago_accounts')
      .select('access_token')
      .eq('creator_id', main.creator_id)
      .maybeSingle();

    if (!mpAccount?.access_token) {
      return json({
        error: 'creator_not_connected',
        message: 'El creador no ha conectado su cuenta de MercadoPago. No se puede procesar el pago.',
      }, 409);
    }
    const sellerAccessToken = mpAccount.access_token;

    const { data: order, error: orderErr } = await admin.from('orders').insert({
      user_id: userId,
      creator_id: main.creator_id,
      product_type: body.product_type,
      product_id: body.product_id,
      amount_clp: totalAmount,
      creator_amount_clp: creatorAmount,
      platform_amount_clp: platformAmount,
      status: 'pending',
      metadata: { title: main.title, has_bump: !!bumpInfo, is_new_user: isNewUser, marketplace: true },
      checkout_page_id: body.checkout_page_id ?? null,
      bump_product_type: bumpInfo?.type ?? null,
      bump_product_id: bumpInfo?.id ?? null,
      bump_amount_clp: bumpInfo?.amount ?? 0,
      guest_email: userEmail,
    } as any).select().single();
    if (orderErr || !order) { console.error('create-payment order error', orderErr); return json({ error: 'No se pudo crear la orden' }, 500); }

    const origin = req.headers.get('origin') ?? body.return_url ?? '';
    const returnBase = `${origin}/#/payment`;

    const items: any[] = [{
      id: order.id, title: main.title.slice(0, 250), quantity: 1, currency_id: 'CLP',
      unit_price: main.amount, picture_url: main.cover ?? undefined,
    }];
    if (bumpInfo) {
      items.push({
        id: `${order.id}-bump`, title: `+ ${bumpInfo.title}`.slice(0, 250), quantity: 1,
        currency_id: 'CLP', unit_price: bumpInfo.amount, picture_url: bumpInfo.cover ?? undefined,
      });
    }

    const preferencePayload = {
      items,
      payer: userEmail ? { email: userEmail } : undefined,
      external_reference: order.id,
      marketplace_fee: platformAmount, // NOVU commission (in CLP, integer) — varies by creator plan
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
        creator_id: main.creator_id,
      },
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sellerAccessToken}` },
      body: JSON.stringify(preferencePayload),
    });
    const mpJson = await mpRes.json();
    if (!mpRes.ok) {
      console.error('MP error', mpRes.status, mpJson);
      await admin.from('orders').update({ status: 'failed', metadata: { ...order.metadata, mp_error: mpJson } }).eq('id', order.id);
      return json({ error: 'MercadoPago error' }, 502);
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
    return json({ error: 'Unexpected error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
