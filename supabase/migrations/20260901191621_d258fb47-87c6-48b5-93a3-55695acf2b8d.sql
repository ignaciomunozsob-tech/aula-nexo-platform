DROP FUNCTION IF EXISTS public.get_course_students(uuid);

CREATE OR REPLACE FUNCTION public.get_course_students(_course_id uuid)
 RETURNS TABLE(user_id uuid, name text, email text, phone text, status text, purchased_at timestamp with time zone, lessons_total integer, lessons_completed integer, progress_pct integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _total integer;
BEGIN
  IF NOT (public.is_course_creator(auth.uid(), _course_id) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT count(*)::int INTO _total
  FROM public.lessons l
  JOIN public.course_modules m ON m.id = l.module_id
  WHERE m.course_id = _course_id;

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
    e.purchased_at,
    _total,
    COALESCE(lp.done, 0)::int,
    CASE WHEN _total > 0 THEN ROUND((COALESCE(lp.done, 0)::numeric / _total) * 100)::int ELSE 0 END
  FROM public.enrollments e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  LEFT JOIN auth.users u ON u.id = e.user_id
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS done
    FROM public.lesson_progress pr
    JOIN public.lessons l ON l.id = pr.lesson_id
    JOIN public.course_modules m ON m.id = l.module_id
    WHERE pr.enrollment_id = e.id AND pr.completed = true AND m.course_id = _course_id
  ) lp ON true
  WHERE e.course_id = _course_id
  ORDER BY e.purchased_at DESC NULLS LAST;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_course_students(uuid) TO authenticated;