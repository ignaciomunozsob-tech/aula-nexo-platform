CREATE OR REPLACE FUNCTION public.prevent_enrollment_privileged_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres') OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.course_id IS DISTINCT FROM OLD.course_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.course_group_id IS DISTINCT FROM OLD.course_group_id THEN
    RAISE EXCEPTION 'enrollment privileged fields cannot be changed by user';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_enrollment_privileged_updates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prevent_enrollment_privileged_updates() TO service_role;