import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export type PaidOrder = {
  id: string;
  reference: string | null;
  product_type: string;
  product_id: string;
  amount_clp: number;
  paid_at: string | null;
  created_at: string;
};

export type EbookPurchase = {
  order_id: string;
  ebook_id: string;
  title: string;
  slug: string | null;
  cover_image_url: string | null;
  purchased_at: string;
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

/** All paid orders of the signed-in student. */
export function useMyPaidOrders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-paid-orders', user?.id],
    queryFn: async (): Promise<PaidOrder[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id, reference, product_type, product_id, amount_clp, paid_at, created_at')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data || []) as PaidOrder[];
    },
    enabled: !!user,
  });
}

/** Ebooks the student has paid for (file access is resolved on demand). */
export function useMyEbooks() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-ebooks', user?.id],
    queryFn: async (): Promise<EbookPurchase[]> => {
      if (!user) return [];
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, product_id, paid_at, created_at')
        .eq('user_id', user.id)
        .eq('product_type', 'ebook')
        .eq('status', 'paid')
        .order('paid_at', { ascending: false, nullsFirst: false });
      if (error) throw error;
      const ids = Array.from(new Set((orders || []).map((o) => o.product_id)));
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
      for (const o of orders || []) {
        if (seen.has(o.product_id)) continue;
        const e = byId.get(o.product_id);
        if (!e) continue;
        seen.add(o.product_id);
        result.push({
          order_id: o.id,
          ebook_id: e.id,
          title: e.title,
          slug: e.slug,
          cover_image_url: e.cover_image_url,
          purchased_at: o.paid_at || o.created_at,
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
