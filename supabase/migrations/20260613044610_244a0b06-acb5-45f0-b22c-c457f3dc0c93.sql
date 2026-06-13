DROP POLICY IF EXISTS "Authenticated users can view reviews" ON public.creator_reviews;

CREATE POLICY "Reviewers can view own review"
ON public.creator_reviews
FOR SELECT
TO authenticated
USING (reviewer_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_creator_reviews(_creator_id uuid)
RETURNS TABLE (
  id uuid,
  rating int,
  comment text,
  created_at timestamptz,
  reviewer_name text,
  reviewer_avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.rating, r.comment, r.created_at,
         p.name AS reviewer_name,
         p.avatar_url AS reviewer_avatar_url
  FROM public.creator_reviews r
  LEFT JOIN public.profiles p ON p.id = r.reviewer_id
  WHERE r.creator_id = _creator_id
  ORDER BY r.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION public.get_creator_reviews(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_review_for_creator(_creator_id uuid)
RETURNS TABLE (
  id uuid,
  rating int,
  comment text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.rating, r.comment, r.created_at
  FROM public.creator_reviews r
  WHERE r.creator_id = _creator_id AND r.reviewer_id = auth.uid()
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_review_for_creator(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_review_for_creator(uuid) TO authenticated;