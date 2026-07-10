
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS guest_phone text;

DROP FUNCTION IF EXISTS public.get_order_public(uuid);

CREATE OR REPLACE FUNCTION public.get_order_public(_order_id uuid)
 RETURNS TABLE(id uuid, status text, product_type text, product_id uuid, amount_clp integer, creator_id uuid, guest_email text, is_new_user boolean, redirect_url text, product_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    o.id,
    o.status::text,
    o.product_type::text,
    o.product_id,
    o.amount_clp,
    o.creator_id,
    o.guest_email,
    COALESCE((o.metadata->>'is_new_user')::boolean, false) AS is_new_user,
    NULLIF(o.metadata->>'redirect_url', '') AS redirect_url,
    NULLIF(o.metadata->>'product_url', '') AS product_url
  FROM public.orders o
  WHERE o.id = _order_id
$function$;
