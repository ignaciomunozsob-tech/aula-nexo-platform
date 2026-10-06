CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value integer NOT NULL CHECK (discount_value > 0),
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  expires_at timestamptz,
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coupons_percent_range CHECK (discount_type <> 'percent' OR discount_value <= 100)
);
CREATE UNIQUE INDEX coupons_creator_code_uniq ON public.coupons (creator_id, upper(code));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators manage own coupons select" ON public.coupons FOR SELECT TO authenticated USING (creator_id = auth.uid());
CREATE POLICY "Creators manage own coupons insert" ON public.coupons FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators manage own coupons update" ON public.coupons FOR UPDATE TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creators manage own coupons delete" ON public.coupons FOR DELETE TO authenticated USING (creator_id = auth.uid());

CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_clp integer NOT NULL DEFAULT 0;
ALTER TABLE public.checkout_pages ADD COLUMN IF NOT EXISTS coupons_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.evaluate_coupon(_code text, _product_type text, _product_id uuid, _subtotal integer)
RETURNS TABLE(coupon_id uuid, code text, discount_type text, discount_value integer, discount_clp integer, error text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE c public.coupons%ROWTYPE; used integer; d integer;
BEGIN
  SELECT * INTO c FROM public.coupons
   WHERE upper(coupons.code) = upper(trim(_code))
     AND coupons.products @> jsonb_build_array(jsonb_build_object('type', _product_type, 'id', _product_id::text))
   LIMIT 1;
  IF NOT FOUND OR NOT c.is_active THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::integer, 0, 'Cupón no válido para este producto'::text; RETURN;
  END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::integer, 0, 'Este cupón ya venció'::text; RETURN;
  END IF;
  IF c.max_uses IS NOT NULL THEN
    SELECT count(*) INTO used FROM public.orders o WHERE o.coupon_id = c.id AND o.status = 'paid';
    IF used >= c.max_uses THEN
      RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::text, NULL::integer, 0, 'Este cupón ya alcanzó su límite de usos'::text; RETURN;
    END IF;
  END IF;
  IF c.discount_type = 'percent' THEN d := round(greatest(_subtotal,0) * c.discount_value / 100.0);
  ELSE d := c.discount_value; END IF;
  d := least(d, greatest(_subtotal, 0));
  RETURN QUERY SELECT c.id, c.code, c.discount_type, c.discount_value, d, NULL::text;
END $$;
GRANT EXECUTE ON FUNCTION public.evaluate_coupon(text, text, uuid, integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.checkout_page_coupons_enabled(_page_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT coalesce((SELECT coupons_enabled FROM public.checkout_pages WHERE id = _page_id AND is_published), false) $$;
GRANT EXECUTE ON FUNCTION public.checkout_page_coupons_enabled(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.coupon_usage_counts()
RETURNS TABLE(coupon_id uuid, uses integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT o.coupon_id, count(*)::int FROM public.orders o JOIN public.coupons c ON c.id = o.coupon_id
      WHERE c.creator_id = auth.uid() AND o.status = 'paid' GROUP BY o.coupon_id $$;
GRANT EXECUTE ON FUNCTION public.coupon_usage_counts() TO authenticated;