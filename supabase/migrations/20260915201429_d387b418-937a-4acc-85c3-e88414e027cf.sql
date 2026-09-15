DROP POLICY IF EXISTS "Creators can update own checkout pages" ON public.checkout_pages;
CREATE POLICY "Creators can update own checkout pages"
ON public.checkout_pages
FOR UPDATE
USING ((creator_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (
  (
    creator_id = auth.uid()
    AND public.creator_owns_product(auth.uid(), product_type, product_id)
    AND (
      bump_product_id IS NULL
      OR public.creator_owns_product(auth.uid(), bump_product_type, bump_product_id)
    )
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);