
-- 1. Drop overly-broad public policies
DROP POLICY IF EXISTS "Creator profiles are publicly viewable" ON public.profiles;
DROP POLICY IF EXISTS "Public can view published checkout pages" ON public.checkout_pages;

-- 2. Public creator profile RPC (single, by slug)
CREATE OR REPLACE FUNCTION public.get_public_creator_profile(_slug text)
RETURNS TABLE(id uuid, name text, avatar_url text, bio text, creator_slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.avatar_url, p.bio, p.creator_slug
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

-- 3. Public creator profiles RPC (batch, by ids) — for marketplace/home listings
CREATE OR REPLACE FUNCTION public.get_public_creators_by_ids(_ids uuid[])
RETURNS TABLE(id uuid, name text, avatar_url text, bio text, creator_slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.avatar_url, p.bio, p.creator_slug
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.id AND ur.role = 'creator'::public.app_role
    )
$$;

REVOKE ALL ON FUNCTION public.get_public_creators_by_ids(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_creators_by_ids(uuid[]) TO anon, authenticated;

-- 4. Public checkout page RPC — returns only the columns needed to render
CREATE OR REPLACE FUNCTION public.get_public_checkout_page(_creator_slug text, _page_slug text)
RETURNS TABLE(
  id uuid,
  slug text,
  name text,
  creator_id uuid,
  product_type text,
  product_id uuid,
  bump_enabled boolean,
  bump_product_type text,
  bump_product_id uuid,
  bump_discount_pct integer,
  bump_headline text,
  bump_description text,
  blocks jsonb,
  theme jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cp.id, cp.slug, cp.name, cp.creator_id, cp.product_type, cp.product_id,
    cp.bump_enabled, cp.bump_product_type, cp.bump_product_id, cp.bump_discount_pct,
    cp.bump_headline, cp.bump_description, cp.blocks, cp.theme
  FROM public.checkout_pages cp
  JOIN public.profiles p ON p.id = cp.creator_id
  WHERE cp.slug = _page_slug
    AND cp.is_published = true
    AND p.creator_slug = _creator_slug
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_public_checkout_page(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_checkout_page(text, text) TO anon, authenticated;
