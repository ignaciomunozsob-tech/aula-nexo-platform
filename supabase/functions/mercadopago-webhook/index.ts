// supabase/functions/mercadopago-webhook/index.ts
// Receives MercadoPago notifications, verifies signature, fulfills order
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!;
const MP_WEBHOOK_SECRET = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
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

// Site URL used for links inside webhook-triggered emails (MP never sends an Origin header).
const PUBLIC_SITE_URL = 'https://soynovu.cl';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') ?? url.searchParams.get('topic');
    let paymentId = url.searchParams.get('data.id') ?? url.searchParams.get('id');
    // MP includes the collector's user_id in the notification (query or body). We use it to
    // resolve the seller's access_token in a single query instead of iterating every account.
    let mpSellerId: string | null = url.searchParams.get('user_id');

    if (!paymentId || !type || !mpSellerId) {
      try {
        const bodyJson = await req.clone().json();
        paymentId = paymentId ?? bodyJson?.data?.id ?? bodyJson?.id ?? null;
        mpSellerId = mpSellerId ?? (bodyJson?.user_id ? String(bodyJson.user_id) : null);
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

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve the seller's access token directly via mp_user_id from the notification.
    let payment: any = null;
    const tried = new Set<string>();

    const tryFetch = async (tok: string) => {
      if (!tok || tried.has(tok)) return false;
      tried.add(tok);
      const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (r.ok) { payment = await r.json(); return true; }
      return false;
    };

    if (mpSellerId) {
      const { data: seller } = await admin
        .from('creator_mercadopago_accounts')
        .select('access_token')
        .eq('mp_user_id', String(mpSellerId))
        .maybeSingle();
      if (seller?.access_token) await tryFetch(seller.access_token);
    }

    // Fallback: platform token (may work for app-level notifications).
    if (!payment && MP_ACCESS_TOKEN) await tryFetch(MP_ACCESS_TOKEN);

    // Last-resort fallback: iterate connected sellers. Kept for backwards compat but should
    // rarely execute now that we resolve via mp_user_id above.
    if (!payment) {
      const { data: sellers } = await admin
        .from('creator_mercadopago_accounts').select('access_token').limit(500);
      for (const s of sellers ?? []) {
        if (await tryFetch(s.access_token)) break;
      }
    }

    if (!payment) {
      console.error('MP fetch payment failed for all tokens');
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

    const orderId: string | undefined = payment?.external_reference || payment?.metadata?.order_id;
    if (!orderId) {
      console.error('Payment without order reference');
      return new Response('ok', { status: 200, headers: corsHeaders });
    }

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

      // If the buyer was created during checkout, send password setup email
      const isNew = !!order.metadata?.is_new_user;
      const buyerEmail: string | null = order.guest_email ?? null;
      if (isNew && buyerEmail) {
        try {
          const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
          await anon.auth.resetPasswordForEmail(buyerEmail, {
            redirectTo: `${PUBLIC_SITE_URL}/reset-password`,
          });
        } catch (e) {
          console.error('reset email error', e);
        }
      }

      // Notify admin of new sale (best-effort, idempotent)
      try {
        let productTitle = '—';
        if (order.product_type === 'course') {
          const { data } = await admin.from('courses').select('title').eq('id', order.product_id).maybeSingle();
          productTitle = data?.title ?? productTitle;
        } else if (order.product_type === 'ebook') {
          const { data } = await admin.from('ebooks').select('title').eq('id', order.product_id).maybeSingle();
          productTitle = data?.title ?? productTitle;
        } else if (order.product_type === 'event') {
          const { data } = await admin.from('events').select('title').eq('id', order.product_id).maybeSingle();
          productTitle = data?.title ?? productTitle;
        }
        let creatorName = '—';
        if (order.creator_id) {
          const { data } = await admin.from('profiles').select('name').eq('id', order.creator_id).maybeSingle();
          creatorName = data?.name ?? creatorName;
        }
        const amountClp: number = order.amount_clp ?? 0;
        // Prefer the persisted breakdown from the order (respects app_settings.commission_pct
        // at the time of purchase); fall back to the legacy 10% only if the columns are missing.
        const communityFeeClp: number = order.community_fee_clp ?? 0;
        const commissionClp: number = order.platform_amount_clp ?? Math.round(amountClp * 0.10);
        const netClp: number = order.creator_amount_clp ?? (amountClp - commissionClp - communityFeeClp);
        const buyer: string = order.guest_email ?? buyerEmail ?? '—';

        await admin.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'admin-new-sale',
            idempotencyKey: `${order.id}-admin-sale`,
            templateData: {
              productTitle, productType: order.product_type,
              creatorName, buyerEmail: buyer,
              amountClp, commissionClp, communityFeeClp, netClp,
              orderId: order.id,
            },
          },
        });
      } catch (e) {
        console.warn('admin-new-sale email error', e);
      }

      // Event confirmation email (paid events)
      if (order.product_type === 'event') {
        try {
          const { data: ev } = await admin.from('events')
            .select('title, event_date, duration_minutes, event_type, location, meeting_url, redirect_url, creator_id')
            .eq('id', order.product_id).maybeSingle();
          if (ev) {
            let creatorName = '';
            if (ev.creator_id) {
              const { data: cp } = await admin.from('profiles').select('name').eq('id', ev.creator_id).maybeSingle();
              creatorName = cp?.name ?? '';
            }
            let attendeeEmail: string | null = order.guest_email ?? null;
            let attendeeName = '';
            if (order.user_id) {
              const { data: prof } = await admin.from('profiles').select('name').eq('id', order.user_id).maybeSingle();
              attendeeName = prof?.name ?? '';
              if (!attendeeEmail) {
                const { data: uRes } = await admin.auth.admin.getUserById(order.user_id);
                attendeeEmail = uRes?.user?.email ?? null;
              }
            }
            if (attendeeEmail) {
              const d = ev.event_date ? new Date(ev.event_date) : null;
              const dateFmt = d ? d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago' }) : '';
              const timeFmt = d ? d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' }) + ' hrs' : '';
              await admin.functions.invoke('send-transactional-email', {
                body: {
                  templateName: 'event-registration-confirmation',
                  recipientEmail: attendeeEmail,
                  idempotencyKey: `evt-reg-${order.id}`,
                  templateData: {
                    attendeeName,
                    eventTitle: ev.title,
                    eventDateFormatted: dateFmt,
                    eventTimeFormatted: timeFmt,
                    durationMin: ev.duration_minutes ?? 60,
                    eventType: ev.event_type === 'in_person' ? 'in_person' : 'online',
                    meetingUrl: ev.meeting_url ?? '',
                    location: ev.location ?? '',
                    creatorName,
                    redirectUrl: ev.redirect_url ?? '',
                    isNewUser: !!((order.metadata as any)?.is_new_user),
                    accountEmail: attendeeEmail,
                  },
                },
              });
            }
          }
        } catch (e) {
          console.warn('event-registration-confirmation email error', e);
        }
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

