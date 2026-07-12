DROP POLICY IF EXISTS "Users can update own reviews" ON public.creator_reviews;
CREATE POLICY "Users can update own reviews"
ON public.creator_reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = reviewer_id)
WITH CHECK (
  auth.uid() = reviewer_id
  AND creator_id = (SELECT cr.creator_id FROM public.creator_reviews cr WHERE cr.id = creator_reviews.id)
);