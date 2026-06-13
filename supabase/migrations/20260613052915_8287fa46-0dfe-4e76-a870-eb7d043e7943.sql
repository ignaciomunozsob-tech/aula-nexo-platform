
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

  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    _safe_role
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _safe_role);

  RETURN NEW;
END;
$function$;
