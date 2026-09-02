ALTER TABLE public.session_bookings
  DROP CONSTRAINT IF EXISTS session_bookings_status_check;
ALTER TABLE public.session_bookings
  ADD CONSTRAINT session_bookings_status_check CHECK (status IN ('pending','confirmed','cancelled'));
ALTER TABLE public.session_bookings
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_session_bookings_order ON public.session_bookings(order_id);
DROP INDEX IF EXISTS uq_bookings_no_overlap_confirmed;
CREATE UNIQUE INDEX uq_bookings_no_overlap_active
  ON public.session_bookings(creator_id, start_at)
  WHERE status IN ('pending','confirmed');

DROP FUNCTION IF EXISTS public.get_public_creator_profile(text);
CREATE OR REPLACE FUNCTION public.get_public_creator_profile(_slug text)
RETURNS TABLE(
  id uuid,
  name text,
  avatar_url text,
  bio text,
  creator_slug text,
  public_product_order jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.name, p.avatar_url, p.bio, p.creator_slug,
         COALESCE(p.public_product_order, '["course", "event", "ebook", "session"]'::jsonb)
  FROM public.profiles p
  WHERE p.creator_slug = _slug
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.id AND ur.role = 'creator'::public.app_role
    )
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_public_creator_profile(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_creator_profile(text) TO anon, authenticated;