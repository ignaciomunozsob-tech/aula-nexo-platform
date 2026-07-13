CREATE OR REPLACE FUNCTION public.get_order_by_reference(_reference text)
RETURNS TABLE(
  id uuid,
  reference text,
  status text,
  product_type text,
  product_id uuid,
  product_title text,
  product_cover_url text,
  amount_clp integer,
  installments smallint,
  creator_id uuid,
  creator_name text,
  creator_slug text,
  buyer_email text,
  is_new_user boolean,
  pixel_fired boolean,
  redirect_url text,
  product_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.reference,
    o.status::text,
    o.product_type::text,
    o.product_id,
    CASE o.product_type::text
      WHEN 'course' THEN (SELECT title FROM public.courses WHERE id = o.product_id)
      WHEN 'ebook'  THEN (SELECT title FROM public.ebooks WHERE id = o.product_id)
      WHEN 'event'  THEN (SELECT title FROM public.events WHERE id = o.product_id)
      WHEN 'community' THEN (SELECT name FROM public.communities WHERE id = o.product_id)
    END,
    CASE o.product_type::text
      WHEN 'course' THEN (SELECT cover_image_url FROM public.courses WHERE id = o.product_id)
      WHEN 'ebook'  THEN (SELECT cover_image_url FROM public.ebooks WHERE id = o.product_id)
      WHEN 'event'  THEN (SELECT cover_image_url FROM public.events WHERE id = o.product_id)
      WHEN 'community' THEN (SELECT cover_url FROM public.communities WHERE id = o.product_id)
    END,
    o.amount_clp,
    o.installments,
    o.creator_id,
    p.name,
    p.creator_slug,
    o.guest_email,
    COALESCE((o.metadata->>'is_new_user')::boolean, false),
    o.pixel_fired,
    COALESCE(
      NULLIF(o.metadata->>'redirect_url', ''),
      CASE o.product_type::text
        WHEN 'course' THEN (SELECT NULLIF(redirect_url, '') FROM public.courses WHERE id = o.product_id)
        WHEN 'ebook'  THEN (SELECT NULLIF(redirect_url, '') FROM public.ebooks WHERE id = o.product_id)
        WHEN 'event'  THEN (SELECT NULLIF(redirect_url, '') FROM public.events WHERE id = o.product_id)
        ELSE NULL
      END
    ),
    NULLIF(o.metadata->>'product_url', '')
  FROM public.orders o
  LEFT JOIN public.profiles p ON p.id = o.creator_id
  WHERE o.reference = _reference
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_order_by_reference(text) TO anon, authenticated;