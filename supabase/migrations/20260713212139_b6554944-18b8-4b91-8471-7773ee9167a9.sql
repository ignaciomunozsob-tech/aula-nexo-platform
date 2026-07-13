
-- 1. Add columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS reference text,
  ADD COLUMN IF NOT EXISTS installments smallint,
  ADD COLUMN IF NOT EXISTS pixel_fired boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS admin_email_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS creator_email_sent boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS orders_reference_key ON public.orders(reference) WHERE reference IS NOT NULL;

-- 2. Reference generator trigger
CREATE OR REPLACE FUNCTION public.orders_generate_reference()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _year text := to_char(now() AT TIME ZONE 'America/Santiago', 'YYYY');
  _candidate text;
  _tries int := 0;
BEGIN
  IF NEW.reference IS NOT NULL AND NEW.reference <> '' THEN
    RETURN NEW;
  END IF;
  LOOP
    _candidate := 'NOV-' || _year || '-' || lpad((floor(random() * 100000))::int::text, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE reference = _candidate);
    _tries := _tries + 1;
    IF _tries > 20 THEN
      _candidate := 'NOV-' || _year || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 5);
      EXIT;
    END IF;
  END LOOP;
  NEW.reference := _candidate;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_generate_reference ON public.orders;
CREATE TRIGGER trg_orders_generate_reference
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.orders_generate_reference();

-- Backfill any existing order without reference
UPDATE public.orders SET reference = 'NOV-' || to_char(created_at AT TIME ZONE 'America/Santiago', 'YYYY')
  || '-' || lpad((floor(random() * 100000))::int::text, 5, '0')
WHERE reference IS NULL;

-- 3. Public RPC to fetch an order by reference (for /compra-confirmada/:reference)
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
    NULLIF(o.metadata->>'redirect_url', ''),
    NULLIF(o.metadata->>'product_url', '')
  FROM public.orders o
  LEFT JOIN public.profiles p ON p.id = o.creator_id
  WHERE o.reference = _reference
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_order_by_reference(text) TO anon, authenticated;

-- 4. Mark pixel fired
CREATE OR REPLACE FUNCTION public.mark_order_pixel_fired(_reference text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _updated int;
BEGIN
  UPDATE public.orders SET pixel_fired = true
    WHERE reference = _reference AND pixel_fired = false AND status = 'paid';
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_order_pixel_fired(text) TO anon, authenticated;
