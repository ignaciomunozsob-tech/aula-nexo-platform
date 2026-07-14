CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(role ORDER BY role), '{}')
  FROM public.user_roles WHERE user_id = _user_id
$$;

GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _safe_role public.app_role;
BEGIN
  _safe_role := CASE NEW.raw_user_meta_data ->> 'role'
    WHEN 'creator' THEN 'creator'::public.app_role
    ELSE 'student'::public.app_role
  END;

  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _safe_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;