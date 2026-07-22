// Shared post-purchase email logic used by mercadopago-webhook and resend-purchase-emails.
// Sends up to 4 emails per paid order (buyer main, buyer bump, creator, admin) and
// records success via *_email_sent flags on the orders row.

const PUBLIC_SITE_URL = 'https://soynovu.cl';

// Deno type shim for editors that don't know about the Deno global.
// deno-lint-ignore no-explicit-any
declare const Deno: any;

// deno-lint-ignore no-explicit-any
export async function sendPurchaseEmails(admin: any, order: any) {
  const isNew = !!order.metadata?.is_new_user;
  const buyerEmail: string | null = order.guest_email ?? null;

  // Resolve product title + creator once
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
  } else if (order.product_type === 'community') {
    const { data } = await admin.from('communities').select('name').eq('id', order.product_id).maybeSingle();
    productTitle = data?.name ?? productTitle;
  }

  let creatorName = '—';
  let creatorAuthEmail: string | null = null;
  if (order.creator_id) {
    const { data } = await admin.from('profiles').select('name').eq('id', order.creator_id).maybeSingle();
    creatorName = data?.name ?? creatorName;
    try {
      const { data: uRes } = await admin.auth.admin.getUserById(order.creator_id);
      creatorAuthEmail = uRes?.user?.email ?? null;
    } catch { /* ignore */ }
  }

  const amountClp: number = order.amount_clp ?? 0;
  const communityFeeClp: number = order.community_fee_clp ?? 0;
  const commissionClp: number = order.platform_amount_clp ?? Math.round(amountClp * 0.10);
  const netClp: number = order.creator_amount_clp ?? (amountClp - commissionClp - communityFeeClp);
  const buyer: string = order.guest_email ?? buyerEmail ?? '—';
  const saleDate = new Date().toLocaleString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago',
  });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sendEmail = async (payload: Record<string, unknown>) => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-transactional-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('send-transactional-email failed', {
        status: res.status,
        body: text,
        templateName: (payload as any).templateName,
        recipientEmail: (payload as any).recipientEmail,
      });
      throw new Error(`send-transactional-email ${res.status}: ${text}`);
    }
    return await res.json().catch(() => ({}));
  };


  const buildBuyerEmailForProduct = async (
    productType: string,
    productId: string,
  ): Promise<{ templateName: string; templateData: Record<string, unknown> } | null> => {
    let title = '—';
    let redirect: string | null = null;
    if (productType === 'course') {
      const { data } = await admin.from('courses').select('title, redirect_url').eq('id', productId).maybeSingle();
      title = data?.title ?? title; redirect = data?.redirect_url ?? null;
    } else if (productType === 'ebook') {
      const { data } = await admin.from('ebooks').select('title, redirect_url').eq('id', productId).maybeSingle();
      title = data?.title ?? title; redirect = data?.redirect_url ?? null;
    } else if (productType === 'community') {
      const { data } = await admin.from('communities').select('name').eq('id', productId).maybeSingle();
      title = data?.name ?? title;
    } else {
      return null;
    }
    const defaultAccessUrl = productType === 'course'
      ? `${PUBLIC_SITE_URL}/app/course/${productId}`
      : `${PUBLIC_SITE_URL}/app/my-courses`;
    const accessUrl = redirect || defaultAccessUrl;
    if (productType === 'course') {
      return { templateName: 'buyer-course-purchase', templateData: { buyerName: '', productTitle: title, creatorName, accessUrl, isNewUser: isNew, accountEmail: buyerEmail } };
    }
    if (productType === 'ebook') {
      return { templateName: 'buyer-ebook-purchase', templateData: { buyerName: '', productTitle: title, creatorName, accessUrl, isNewUser: isNew, accountEmail: buyerEmail } };
    }
    return { templateName: 'buyer-community-purchase', templateData: { buyerName: '', communityName: title, creatorName, accessUrl, isNewUser: isNew, accountEmail: buyerEmail } };
  };

  const buildEventEmail = async (eventId: string, recipient: string, attendeeNameOverride?: string) => {
    const { data: ev } = await admin.from('events')
      .select('title, event_date, duration_minutes, event_type, location, meeting_url, redirect_url, creator_id')
      .eq('id', eventId).maybeSingle();
    if (!ev) return null;
    let evCreatorName = creatorName;
    if ((!evCreatorName || evCreatorName === '—') && ev.creator_id) {
      const { data: cp } = await admin.from('profiles').select('name').eq('id', ev.creator_id).maybeSingle();
      evCreatorName = cp?.name ?? '';
    }
    const d = ev.event_date ? new Date(ev.event_date) : null;
    const dateFmt = d ? d.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago' }) : '';
    const timeFmt = d ? d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' }) + ' hrs' : '';
    return {
      attendeeName: attendeeNameOverride ?? (order.guest_name ?? ''),
      eventTitle: ev.title,
      eventDateFormatted: dateFmt,
      eventTimeFormatted: timeFmt,
      durationMin: ev.duration_minutes ?? 60,
      eventType: ev.event_type === 'in_person' ? 'in_person' : 'online',
      meetingUrl: ev.meeting_url ?? '',
      location: ev.location ?? '',
      creatorName: evCreatorName,
      redirectUrl: ev.redirect_url ?? '',
      isNewUser: isNew,
      accountEmail: recipient,
    };
  };

  const results = { buyer: false, bump: false, admin: false, creator: false, errors: [] as string[] };

  // Buyer confirmation email — MAIN product
  if (!order.buyer_email_sent && buyerEmail) {
    try {
      if (order.product_type === 'event') {
        let attendeeName = order.guest_name ?? '';
        if (order.user_id && !attendeeName) {
          const { data: prof } = await admin.from('profiles').select('name').eq('id', order.user_id).maybeSingle();
          attendeeName = prof?.name ?? '';
        }
        const data = await buildEventEmail(order.product_id, buyerEmail, attendeeName);
        if (data) {
          await sendEmail({
            templateName: 'event-registration-confirmation',
            recipientEmail: buyerEmail,
            idempotencyKey: `evt-reg-${order.id}`,
            templateData: data,
          });
          await admin.from('orders').update({ buyer_email_sent: true }).eq('id', order.id);
          results.buyer = true;
        }
      } else {
        const spec = await buildBuyerEmailForProduct(order.product_type, order.product_id);
        if (spec) {
          await sendEmail({
            templateName: spec.templateName,
            recipientEmail: buyerEmail,
            idempotencyKey: `${order.id}-buyer-${order.product_type}`,
            templateData: spec.templateData,
          });
          await admin.from('orders').update({ buyer_email_sent: true }).eq('id', order.id);
          results.buyer = true;
        }
      }
    } catch (e) {
      console.warn('buyer purchase email error', e);
      results.errors.push(`buyer: ${(e as Error).message ?? e}`);
    }
  }

  // Order bump — separate confirmation
  if (
    !order.bump_email_sent && buyerEmail &&
    order.bump_product_type && order.bump_product_id && (order.bump_amount_clp ?? 0) > 0
  ) {
    try {
      if (order.bump_product_type === 'event') {
        const data = await buildEventEmail(order.bump_product_id, buyerEmail);
        if (data) {
          await sendEmail({
            templateName: 'event-registration-confirmation',
            recipientEmail: buyerEmail,
            idempotencyKey: `evt-reg-${order.id}-bump`,
            templateData: data,
          });
          await admin.from('orders').update({ bump_email_sent: true }).eq('id', order.id);
          results.bump = true;
        }
      } else {
        const spec = await buildBuyerEmailForProduct(order.bump_product_type, order.bump_product_id);
        if (spec) {
          await sendEmail({
            templateName: spec.templateName,
            recipientEmail: buyerEmail,
            idempotencyKey: `${order.id}-buyer-bump-${order.bump_product_type}`,
            templateData: spec.templateData,
          });
          await admin.from('orders').update({ bump_email_sent: true }).eq('id', order.id);
          results.bump = true;
        }
      }
    } catch (e) {
      console.warn('bump buyer email error', e);
      results.errors.push(`bump: ${(e as Error).message ?? e}`);
    }
  }

  // Admin
  if (!order.admin_email_sent) {
    try {
      await sendEmail({
        templateName: 'admin-new-sale',
        idempotencyKey: `${order.id}-admin-sale`,
        templateData: {
          productTitle, productType: order.product_type,
          creatorName, buyerEmail: buyer,
          amountClp, commissionClp, communityFeeClp, netClp,
          orderId: order.reference ?? order.id,
        },
      });
      await admin.from('orders').update({ admin_email_sent: true }).eq('id', order.id);
      results.admin = true;
    } catch (e) {
      console.warn('admin-new-sale email error', e);
      results.errors.push(`admin: ${(e as Error).message ?? e}`);
    }
  }

  // Creator
  if (!order.creator_email_sent && creatorAuthEmail) {
    try {
      await sendEmail({
        templateName: 'creator-new-sale',
        recipientEmail: creatorAuthEmail,
        idempotencyKey: `${order.id}-creator-sale`,
        templateData: {
          creatorName, productTitle,
          buyerLabel: buyer, amountClp,
          commissionClp, communityFeeClp, netClp,
          reference: order.reference ?? '',
          saleDate,
          financesUrl: `${PUBLIC_SITE_URL}/creator-app/finances`,
        },
      });
      await admin.from('orders').update({ creator_email_sent: true }).eq('id', order.id);
      results.creator = true;
    } catch (e) {
      console.warn('creator-new-sale email error', e);
      results.errors.push(`creator: ${(e as Error).message ?? e}`);
    }
  }

  return results;
}
