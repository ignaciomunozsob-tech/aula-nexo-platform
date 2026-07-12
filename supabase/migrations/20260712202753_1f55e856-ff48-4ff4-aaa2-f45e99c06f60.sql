-- Allow enrolled students and course creators to read hosted-video metadata required by the course player/editor.
-- The actual protected media URL remains hidden; this only exposes non-secret embed status/id fields through existing RLS.
GRANT SELECT (bunny_video_id, bunny_status, video_source)
ON public.lessons TO authenticated;

-- Fix creator review immutability: WITH CHECK cannot compare against OLD values, so enforce via trigger.
CREATE OR REPLACE FUNCTION public.prevent_creator_review_reassign()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.creator_id IS DISTINCT FROM OLD.creator_id
     OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id THEN
    RAISE EXCEPTION 'creator_id and reviewer_id are immutable';
  END IF;
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trg_prevent_creator_review_reassign ON public.creator_reviews;
CREATE TRIGGER trg_prevent_creator_review_reassign
  BEFORE UPDATE ON public.creator_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_creator_review_reassign();

DROP POLICY IF EXISTS "Users can update own reviews" ON public.creator_reviews;
CREATE POLICY "Users can update own reviews"
ON public.creator_reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = reviewer_id)
WITH CHECK (auth.uid() = reviewer_id);