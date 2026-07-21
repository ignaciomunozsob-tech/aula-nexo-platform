
-- 1. Add is_default to checkout_pages
ALTER TABLE public.checkout_pages
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS checkout_pages_default_per_product
  ON public.checkout_pages (creator_id, product_type, product_id)
  WHERE is_default = true AND is_published = true;

-- 2. RPC: prefer default published page (0 or 1 row)
CREATE OR REPLACE FUNCTION public.get_product_checkout_page(_product_type text, _product_id uuid)
RETURNS TABLE(creator_slug text, page_slug text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT p.creator_slug, cp.slug
  FROM public.checkout_pages cp
  JOIN public.profiles p ON p.id = cp.creator_id
  WHERE cp.product_type = _product_type
    AND cp.product_id = _product_id
    AND cp.is_published = true
    AND cp.is_default = true
    AND p.creator_slug IS NOT NULL
  ORDER BY cp.updated_at DESC
  LIMIT 1
$function$;

-- 3. Security fix: block public exposure of events.meeting_url via column-level privileges.
--    Public/logged-in users must call get_event_meeting_url() which validates access.
REVOKE SELECT ON public.events FROM anon, authenticated;
GRANT SELECT (
  id, creator_id, category_id, title, slug, description, cover_image_url,
  price_clp, redirect_url, status, event_date, event_type, duration_minutes,
  location, max_attendees, is_novu_official, created_at, updated_at
) ON public.events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
