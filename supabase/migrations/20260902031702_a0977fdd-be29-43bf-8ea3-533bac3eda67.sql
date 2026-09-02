-- 1. Extend creator_reviews
ALTER TABLE public.creator_reviews ALTER COLUMN reviewer_id DROP NOT NULL;
ALTER TABLE public.creator_reviews DROP CONSTRAINT IF EXISTS creator_reviews_creator_id_reviewer_id_key;
ALTER TABLE public.creator_reviews
  ADD COLUMN IF NOT EXISTS product_type text,
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS product_title text,
  ADD COLUMN IF NOT EXISTS reviewer_name text,
  ADD COLUMN IF NOT EXISTS reviewer_email text,
  ADD COLUMN IF NOT EXISTS is_anonymous boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verified_purchase boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS creator_reviews_unique_user_creator
  ON public.creator_reviews (creator_id, reviewer_id)
  WHERE reviewer_id IS NOT NULL AND product_id IS NULL;

-- 2. Review requests
CREATE TABLE IF NOT EXISTS public.review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_type text NOT NULL,
  product_id uuid NOT NULL,
  product_title text,
  recipient_email text NOT NULL,
  recipient_name text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  sent_at timestamptz,
  submitted_at timestamptz,
  review_id uuid REFERENCES public.creator_reviews(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS review_requests_unique_target
  ON public.review_requests (creator_id, product_type, product_id, lower(recipient_email));

GRANT SELECT ON public.review_requests TO authenticated;
GRANT ALL ON public.review_requests TO service_role;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view own review requests" ON public.review_requests;
CREATE POLICY "Creators can view own review requests" ON public.review_requests
  FOR SELECT TO authenticated USING (creator_id = auth.uid());

DROP TRIGGER IF EXISTS update_review_requests_updated_at ON public.review_requests;
CREATE TRIGGER update_review_requests_updated_at
  BEFORE UPDATE ON public.review_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Public RPCs
CREATE OR REPLACE FUNCTION public.get_review_request(_token text)
RETURNS TABLE(creator_id uuid, creator_name text, creator_slug text, creator_avatar_url text,
              product_type text, product_title text, recipient_name text, submitted boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.creator_id, p.name, p.creator_slug, p.avatar_url,
         r.product_type, r.product_title, r.recipient_name, (r.submitted_at IS NOT NULL)
  FROM public.review_requests r
  LEFT JOIN public.profiles p ON p.id = r.creator_id
  WHERE r.token = _token
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.submit_review_by_token(
  _token text, _rating integer, _comment text, _is_anonymous boolean, _name text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  req public.review_requests%ROWTYPE;
  new_id uuid;
BEGIN
  IF _rating IS NULL OR _rating < 1 OR _rating > 5 THEN
    RAISE EXCEPTION 'invalid_rating';
  END IF;

  SELECT * INTO req FROM public.review_requests WHERE token = _token;
  IF req.id IS NULL THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;
  IF req.submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'already_submitted';
  END IF;

  INSERT INTO public.creator_reviews (
    creator_id, reviewer_id, rating, comment, product_type, product_id, product_title,
    reviewer_name, reviewer_email, is_anonymous, verified_purchase
  ) VALUES (
    req.creator_id, NULL, _rating, NULLIF(btrim(coalesce(_comment, '')), ''),
    req.product_type, req.product_id, req.product_title,
    COALESCE(NULLIF(btrim(coalesce(_name, '')), ''), req.recipient_name),
    req.recipient_email, COALESCE(_is_anonymous, false), true
  ) RETURNING id INTO new_id;

  UPDATE public.review_requests
     SET submitted_at = now(), review_id = new_id
   WHERE id = req.id;

  RETURN new_id;
END;
$$;

DROP FUNCTION IF EXISTS public.get_creator_reviews(uuid);
CREATE FUNCTION public.get_creator_reviews(_creator_id uuid)
RETURNS TABLE(id uuid, rating integer, comment text, created_at timestamptz,
              reviewer_name text, reviewer_avatar_url text,
              product_type text, product_title text, is_anonymous boolean, verified_purchase boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.rating, r.comment, r.created_at,
         CASE WHEN r.is_anonymous THEN 'Anónimo'
              ELSE COALESCE(p.name, r.reviewer_name, 'Usuario') END,
         CASE WHEN r.is_anonymous THEN NULL ELSE p.avatar_url END,
         r.product_type, r.product_title, r.is_anonymous, r.verified_purchase
  FROM public.creator_reviews r
  LEFT JOIN public.profiles p ON p.id = r.reviewer_id
  WHERE r.creator_id = _creator_id
  ORDER BY r.created_at DESC
$$;

GRANT EXECUTE ON FUNCTION public.get_review_request(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_review_by_token(text, integer, text, boolean, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_reviews(uuid) TO anon, authenticated;