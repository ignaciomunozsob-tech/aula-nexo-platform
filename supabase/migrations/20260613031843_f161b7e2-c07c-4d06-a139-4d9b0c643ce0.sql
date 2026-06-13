
CREATE OR REPLACE FUNCTION public.get_creator_pixel_id_by_id(_creator_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT meta_pixel_id FROM public.profiles
  WHERE id = _creator_id AND role = 'creator'
$$;

REVOKE ALL ON FUNCTION public.get_creator_pixel_id_by_id(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_creator_pixel_id_by_id(uuid) TO anon, authenticated;
