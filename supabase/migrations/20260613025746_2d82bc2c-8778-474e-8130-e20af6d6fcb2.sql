
-- 1) checkout_pages
CREATE TABLE public.checkout_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_type text NOT NULL CHECK (product_type IN ('course','ebook','event','community')),
  product_id uuid NOT NULL,
  slug text NOT NULL,
  name text NOT NULL DEFAULT 'Página de pago',
  is_published boolean NOT NULL DEFAULT false,
  bump_enabled boolean NOT NULL DEFAULT false,
  bump_product_type text CHECK (bump_product_type IN ('course','ebook','event','community')),
  bump_product_id uuid,
  bump_discount_pct integer NOT NULL DEFAULT 0 CHECK (bump_discount_pct >= 0 AND bump_discount_pct <= 90),
  bump_headline text,
  bump_description text,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme jsonb NOT NULL DEFAULT '{"primary":"#004aad","background":"#ffffff"}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, slug)
);

GRANT SELECT ON public.checkout_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkout_pages TO authenticated;
GRANT ALL ON public.checkout_pages TO service_role;

ALTER TABLE public.checkout_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published checkout pages"
  ON public.checkout_pages FOR SELECT
  USING (is_published = true);

CREATE POLICY "Creators can view own checkout pages"
  ON public.checkout_pages FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Creators can insert own checkout pages"
  ON public.checkout_pages FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update own checkout pages"
  ON public.checkout_pages FOR UPDATE
  TO authenticated
  USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Creators can delete own checkout pages"
  ON public.checkout_pages FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_checkout_pages_updated_at
  BEFORE UPDATE ON public.checkout_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_checkout_pages_creator ON public.checkout_pages(creator_id);
CREATE INDEX idx_checkout_pages_product ON public.checkout_pages(product_type, product_id);

-- 2) orders: campos para checkout page y bump
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_page_id uuid REFERENCES public.checkout_pages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bump_product_type text CHECK (bump_product_type IN ('course','ebook','event','community')),
  ADD COLUMN IF NOT EXISTS bump_product_id uuid,
  ADD COLUMN IF NOT EXISTS bump_amount_clp integer NOT NULL DEFAULT 0;
