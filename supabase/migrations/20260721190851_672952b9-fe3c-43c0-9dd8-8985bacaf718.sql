
DROP FUNCTION IF EXISTS public.get_course_students(uuid);
DROP FUNCTION IF EXISTS public.get_event_students(uuid);

CREATE OR REPLACE FUNCTION public.get_course_students(_course_id uuid)
 RETURNS TABLE(user_id uuid, name text, email text, phone text, status text, purchased_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_course_creator(auth.uid(), _course_id) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    e.user_id,
    p.name,
    u.email::text,
    COALESCE(
      (SELECT o.guest_phone
         FROM public.orders o
        WHERE o.user_id = e.user_id
          AND o.product_type = 'course'
          AND o.product_id = _course_id
          AND o.guest_phone IS NOT NULL
        ORDER BY o.created_at DESC
        LIMIT 1),
      NULLIF(u.raw_user_meta_data->>'phone','')
    )::text,
    e.status,
    e.purchased_at
  FROM public.enrollments e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  LEFT JOIN auth.users u ON u.id = e.user_id
  WHERE e.course_id = _course_id
  ORDER BY e.purchased_at DESC NULLS LAST;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_event_students(_event_id uuid)
 RETURNS TABLE(user_id uuid, name text, email text, phone text, status text, registered_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    COALESCE(
      (SELECT o.guest_phone
         FROM public.orders o
        WHERE o.user_id = r.user_id
          AND o.product_type = 'event'
          AND o.product_id = _event_id
          AND o.guest_phone IS NOT NULL
        ORDER BY o.created_at DESC
        LIMIT 1),
      NULLIF(u.raw_user_meta_data->>'phone','')
    )::text,
    r.status,
    r.registered_at
  FROM public.event_registrations r
  LEFT JOIN public.profiles p ON p.id = r.user_id
  LEFT JOIN auth.users u ON u.id = r.user_id
  WHERE r.event_id = _event_id
  ORDER BY r.registered_at DESC NULLS LAST;
END;
$function$;
