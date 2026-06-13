
CREATE OR REPLACE FUNCTION public.get_course_students(_course_id uuid)
RETURNS TABLE (
  user_id uuid,
  name text,
  email text,
  status text,
  purchased_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_course_creator(auth.uid(), _course_id) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    e.user_id,
    p.name,
    u.email::text,
    e.status,
    e.purchased_at
  FROM public.enrollments e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  LEFT JOIN auth.users u ON u.id = e.user_id
  WHERE e.course_id = _course_id
  ORDER BY e.purchased_at DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_course_students(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_course_students(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_event_students(_event_id uuid)
RETURNS TABLE (
  user_id uuid,
  name text,
  email text,
  status text,
  registered_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _creator uuid;
BEGIN
  SELECT creator_id INTO _creator FROM public.events WHERE id = _event_id;
  IF _creator IS NULL OR (_creator <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    r.user_id,
    p.name,
    u.email::text,
    r.status,
    r.registered_at
  FROM public.event_registrations r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  LEFT JOIN auth.users u ON u.id = r.user_id
  WHERE r.event_id = _event_id
  ORDER BY r.registered_at DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_event_students(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_event_students(uuid) TO authenticated;
