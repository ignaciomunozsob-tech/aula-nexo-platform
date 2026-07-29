import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

/** A single purchase line: an order may produce two lines when it has an order bump. */
export type PurchaseLine = {
  id: string;
  order_id: string;
  reference: string | null;
  product_type: string;
  product_id: string;
  amount_clp: number;
  paid_at: string | null;
  created_at: string;
  is_bump: boolean;
};

export type PaidOrder = PurchaseLine;

export type EbookPurchase = {
  order_id: string;
  ebook_id: string;
  title: string;
  slug: string | null;
  cover_image_url: string | null;
  purchased_at: string;
  is_bump: boolean;
};

export type SessionBooking = {
  id: string;
  session_id: string;
  session_title: string;
  creator_id: string;
  creator_name: string | null;
  start_at: string;
  end_at: string;
  status: string;
  meet_url: string | null;
  ics_token: string | null;
};

/**
 * All paid orders of the signed-in student, expanded into purchase lines:
 * an order with an order bump becomes two separate lines (main product + bump).
 */
export function useMyPaidOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-paid-orders', user?.id],
    queryFn: async (): Promise<PurchaseLine[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(
          'id, reference, product_type, product_id, amount_clp, bump_product_type, bump_product_id, bump_amount_clp, paid_at, created_at',
        )
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false, nullsFirst: false });
      if (error) throw error;

      const lines: PurchaseLine[] = [];
      for (const o of data || []) {
        const bumpAmount = o.bump_product_id ? (o.bump_amount_clp ?? 0) : 0;
        lines.push({
          id: `${o.id}-main`,
          order_id: o.id,
          reference: o.reference,
          product_type: o.product_type,
          product_id: o.product_id,
          amount_clp: Math.max((o.amount_clp ?? 0) - bumpAmount, 0),
          paid_at: o.paid_at,
          created_at: o.created_at,
          is_bump: false,
        });
        if (o.bump_product_id && o.bump_product_type) {
          lines.push({
            id: `${o.id}-bump`,
            order_id: o.id,
            reference: o.reference,
            product_type: o.bump_product_type,
            product_id: o.bump_product_id,
            amount_clp: bumpAmount,
            paid_at: o.paid_at,
            created_at: o.created_at,
            is_bump: true,
          });
        }
      }
      return lines;
    },
    enabled: !!user,
  });
}

/**
 * Ebooks the student has paid for — either as the main product of an order or
 * as an order bump attached to another product. File access is resolved on demand.
 */
export function useMyEbooks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-ebooks', user?.id],
    queryFn: async (): Promise<EbookPurchase[]> => {
      if (!user) return [];
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, product_type, product_id, bump_product_type, bump_product_id, paid_at, created_at')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .or('product_type.eq.ebook,bump_product_type.eq.ebook')
        .order('paid_at', { ascending: false, nullsFirst: false });
      if (error) throw error;

      type Entry = { order_id: string; ebook_id: string; purchased_at: string; is_bump: boolean };
      const entries: Entry[] = [];
      for (const o of orders || []) {
        const when = o.paid_at || o.created_at;
        if (o.product_type === 'ebook' && o.product_id) {
          entries.push({ order_id: o.id, ebook_id: o.product_id, purchased_at: when, is_bump: false });
        }
        if (o.bump_product_type === 'ebook' && o.bump_product_id) {
          entries.push({ order_id: o.id, ebook_id: o.bump_product_id, purchased_at: when, is_bump: true });
        }
      }

      const ids = Array.from(new Set(entries.map((e) => e.ebook_id)));
      if (ids.length === 0) return [];

      // file_url is column-restricted; never select it from the client.
      const { data: ebooks, error: ebookErr } = await supabase
        .from('ebooks')
        .select('id, title, slug, cover_image_url')
        .in('id', ids);
      if (ebookErr) throw ebookErr;

      const byId = new Map((ebooks || []).map((e) => [e.id, e]));
      const seen = new Set<string>();
      const result: EbookPurchase[] = [];
      for (const entry of entries) {
        if (seen.has(entry.ebook_id)) continue;
        const e = byId.get(entry.ebook_id);
        if (!e) continue;
        seen.add(entry.ebook_id);
        result.push({
          order_id: entry.order_id,
          ebook_id: e.id,
          title: e.title,
          slug: e.slug,
          cover_image_url: e.cover_image_url,
          purchased_at: entry.purchased_at,
          is_bump: entry.is_bump,
        });
      }
      return result;
    },
    enabled: !!user,
  });
}

/** 1:1 session bookings of the signed-in student. */
export function useMySessionBookings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-session-bookings', user?.id],
    queryFn: async (): Promise<SessionBooking[]> => {
      if (!user) return [];
      const { data, error } = await supabase.rpc('get_my_session_bookings');
      if (error) throw error;
      return (data || []) as SessionBooking[];
    },
    enabled: !!user,
  });
}

/** Resolves a short-lived signed URL for a purchased ebook. */
export async function getEbookDownloadUrl(ebookId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-protected-url', {
    body: { kind: 'ebook', id: ebookId },
  });
  if (error) throw error;
  const url = (data as { url?: string })?.url;
  if (!url) throw new Error('No se pudo generar el enlace de descarga');
  return url;
}
