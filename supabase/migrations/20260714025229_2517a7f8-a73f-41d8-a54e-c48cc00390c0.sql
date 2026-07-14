DROP POLICY IF EXISTS "Users can update own reviews" ON public.creator_reviews;

CREATE POLICY "Users can update own reviews"
ON public.creator_reviews
FOR UPDATE
TO authenticated
USING (reviewer_id = auth.uid())
WITH CHECK (
  reviewer_id = auth.uid()
  AND creator_id = (SELECT creator_id FROM public.creator_reviews WHERE id = creator_reviews.id)
);

-- Also prevent changing creator_id or reviewer_id via trigger for defense in depth
CREATE OR REPLACE FUNCTION public.prevent_creator_reviews_reassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.creator_id IS DISTINCT FROM OLD.creator_id THEN
    RAISE EXCEPTION 'creator_id cannot be modified';
  END IF;
  IF NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id THEN
    RAISE EXCEPTION 'reviewer_id cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_creator_reviews_reassignment_trg ON public.creator_reviews;
CREATE TRIGGER prevent_creator_reviews_reassignment_trg
BEFORE UPDATE ON public.creator_reviews
FOR EACH ROW
EXECUTE FUNCTION public.prevent_creator_reviews_reassignment();