
-- Fix checkout_pages INSERT: require creator role and ownership of referenced products
DROP POLICY IF EXISTS "Creators can insert own checkout pages" ON public.checkout_pages;

CREATE OR REPLACE FUNCTION public.creator_owns_product(_creator_id uuid, _product_type text, _product_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE _product_type
    WHEN 'course'  THEN EXISTS (SELECT 1 FROM public.courses WHERE id = _product_id AND creator_id = _creator_id)
    WHEN 'event'   THEN EXISTS (SELECT 1 FROM public.events WHERE id = _product_id AND creator_id = _creator_id)
    WHEN 'ebook'   THEN EXISTS (SELECT 1 FROM public.ebooks WHERE id = _product_id AND creator_id = _creator_id)
    WHEN 'session' THEN EXISTS (SELECT 1 FROM public.one_on_one_sessions WHERE id = _product_id AND creator_id = _creator_id)
    ELSE false
  END
$$;

CREATE POLICY "Creators can insert own checkout pages"
ON public.checkout_pages
FOR INSERT
TO authenticated
WITH CHECK (
  creator_id = auth.uid()
  AND public.has_role(auth.uid(), 'creator'::public.app_role)
  AND public.creator_owns_product(auth.uid(), product_type, product_id)
  AND (
    bump_product_id IS NULL
    OR public.creator_owns_product(auth.uid(), bump_product_type, bump_product_id)
  )
);

-- Fix creator_reviews UPDATE: add WITH CHECK pinning reviewer_id and creator_id
DROP POLICY IF EXISTS "Users can update own reviews" ON public.creator_reviews;

CREATE POLICY "Users can update own reviews"
ON public.creator_reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = reviewer_id)
WITH CHECK (
  auth.uid() = reviewer_id
  AND creator_id = (SELECT creator_id FROM public.creator_reviews WHERE id = creator_reviews.id)
);
