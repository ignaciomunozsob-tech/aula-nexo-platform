CREATE OR REPLACE FUNCTION public.get_ebook_students(_ebook_id uuid)
RETURNS TABLE (
  order_id uuid,
  user_id uuid,
  name text,
  email text,
  phone text,
  amount_clp integer,
  is_bump boolean,
  purchased_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id AS order_id,
    o.user_id,
    COALESCE(p.name, o.guest_name) AS name,
    COALESCE(au.email, o.guest_email) AS email,
    o.guest_phone AS phone,
    CASE
      WHEN o.bump_product_id = _ebook_id THEN COALESCE(o.bump_amount_clp, 0)
      ELSE GREATEST(o.amount_clp - CASE WHEN o.bump_product_id IS NOT NULL THEN COALESCE(o.bump_amount_clp, 0) ELSE 0 END, 0)
    END AS amount_clp,
    (o.bump_product_id = _ebook_id) AS is_bump,
    COALESCE(o.paid_at, o.created_at) AS purchased_at
  FROM public.orders o
  LEFT JOIN public.profiles p ON p.id = o.user_id
  LEFT JOIN auth.users au ON au.id = o.user_id
  WHERE o.status = 'paid'
    AND (o.product_id = _ebook_id AND o.product_type = 'ebook'
         OR o.bump_product_id = _ebook_id AND o.bump_product_type = 'ebook')
    AND EXISTS (
      SELECT 1 FROM public.ebooks e
      WHERE e.id = _ebook_id AND e.creator_id = auth.uid()
    )
  ORDER BY purchased_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_ebook_students(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ebook_students(uuid) TO authenticated;