
-- 1. Column-level REVOKEs (defense in depth)
REVOKE SELECT (meta_pixel_id) ON public.profiles FROM anon, authenticated;
REVOKE SELECT (meeting_url) ON public.events FROM anon, authenticated;
REVOKE SELECT (file_url) ON public.ebooks FROM anon, authenticated;

-- 2. Public RPC: returns pixel ID by creator slug (for ad tracking on creator pages)
CREATE OR REPLACE FUNCTION public.get_creator_pixel_id(_creator_slug text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT meta_pixel_id
  FROM public.profiles
  WHERE creator_slug = _creator_slug
    AND role = 'creator'
$$;

REVOKE ALL ON FUNCTION public.get_creator_pixel_id(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_creator_pixel_id(text) TO anon, authenticated;

-- 3. Owner RPC: returns the authenticated creator's own pixel (for the editor)
CREATE OR REPLACE FUNCTION public.get_my_meta_pixel_id()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT meta_pixel_id FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_my_meta_pixel_id() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_meta_pixel_id() TO authenticated;
