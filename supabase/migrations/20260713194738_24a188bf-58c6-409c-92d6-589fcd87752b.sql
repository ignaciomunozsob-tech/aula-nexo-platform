CREATE OR REPLACE FUNCTION public.get_creator_pixel_id(_creator_slug text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.meta_pixel_id
  FROM public.profiles p
  WHERE p.creator_slug = _creator_slug
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.id AND ur.role = 'creator'::public.app_role
    )
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.get_creator_pixel_id_by_id(_creator_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.meta_pixel_id
  FROM public.profiles p
  WHERE p.id = _creator_id
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = p.id AND ur.role = 'creator'::public.app_role
    )
  LIMIT 1
$function$;