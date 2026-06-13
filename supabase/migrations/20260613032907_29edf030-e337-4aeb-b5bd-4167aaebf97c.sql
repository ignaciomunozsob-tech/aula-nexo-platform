
CREATE OR REPLACE FUNCTION public.get_order_public(_order_id uuid)
RETURNS TABLE(
  id uuid,
  status text,
  product_type text,
  product_id uuid,
  amount_clp integer,
  creator_id uuid,
  guest_email text,
  is_new_user boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    o.id,
    o.status::text,
    o.product_type::text,
    o.product_id,
    o.amount_clp,
    o.creator_id,
    o.guest_email,
    COALESCE((o.metadata->>'is_new_user')::boolean, false) AS is_new_user
  FROM public.orders o
  WHERE o.id = _order_id
$$;

REVOKE ALL ON FUNCTION public.get_order_public(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_order_public(uuid) TO anon, authenticated;
