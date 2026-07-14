DROP POLICY IF EXISTS "Users can update own reviews" ON public.creator_reviews;

CREATE POLICY "Users can update own reviews"
ON public.creator_reviews
FOR UPDATE
TO authenticated
USING (reviewer_id = auth.uid())
WITH CHECK (
  reviewer_id = auth.uid()
  AND creator_id = (SELECT cr.creator_id FROM public.creator_reviews cr WHERE cr.id = creator_reviews.id)
  AND reviewer_id = (SELECT cr.reviewer_id FROM public.creator_reviews cr WHERE cr.id = creator_reviews.id)
);