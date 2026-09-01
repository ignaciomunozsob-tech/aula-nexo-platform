-- Public read of course groups (safe columns only)
CREATE OR REPLACE FUNCTION public.get_course_groups_public(_course_id uuid)
RETURNS TABLE(id uuid, name text, price_clp integer, is_default boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id, g.name, g.price_clp, g.is_default
  FROM public.course_groups g
  JOIN public.courses c ON c.id = g.course_id
  WHERE g.course_id = _course_id
    AND (c.status = 'published' OR c.creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ORDER BY g.is_default DESC, g.created_at ASC;
$$;
REVOKE ALL ON FUNCTION public.get_course_groups_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_course_groups_public(uuid) TO anon, authenticated;

-- Module access gated by the student's cohort
CREATE OR REPLACE FUNCTION public.has_module_access(_user_id uuid, _module_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_modules m
    JOIN public.courses c ON c.id = m.course_id
    LEFT JOIN public.enrollments e
      ON e.course_id = c.id AND e.user_id = _user_id AND e.status = 'active'
    WHERE m.id = _module_id
      AND (
        c.creator_id = _user_id
        OR public.has_role(_user_id, 'admin')
        OR (
          e.id IS NOT NULL
          AND (
            e.course_group_id IS NULL
            OR EXISTS (
              SELECT 1 FROM public.course_group_modules gm
              WHERE gm.group_id = e.course_group_id AND gm.module_id = m.id
            )
          )
        )
      )
  )
$$;
REVOKE ALL ON FUNCTION public.has_module_access(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_module_access(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Lessons viewable if enrolled or creator" ON public.lessons;
CREATE POLICY "Lessons viewable if group access or creator" ON public.lessons
FOR SELECT USING (public.has_module_access(auth.uid(), module_id));

-- Creator/admin assigns a student's cohort
CREATE OR REPLACE FUNCTION public.set_enrollment_group(_course_id uuid, _user_id uuid, _group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_course_creator(auth.uid(), _course_id) OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _group_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.course_groups g WHERE g.id = _group_id AND g.course_id = _course_id
  ) THEN
    RAISE EXCEPTION 'group does not belong to course';
  END IF;
  UPDATE public.enrollments
     SET course_group_id = _group_id
   WHERE course_id = _course_id AND user_id = _user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_enrollment_group(uuid, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_enrollment_group(uuid, uuid, uuid) TO authenticated;

-- Student roster now exposes cohort info
DROP FUNCTION IF EXISTS public.get_course_students(uuid);
CREATE OR REPLACE FUNCTION public.get_course_students(_course_id uuid)
RETURNS TABLE(user_id uuid, name text, email text, phone text, status text, purchased_at timestamp with time zone, lessons_total integer, lessons_completed integer, progress_pct integer, course_group_id uuid, course_group_name text)
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
    tot.total,
    COALESCE(lp.done, 0)::int,
    CASE WHEN tot.total > 0 THEN ROUND((COALESCE(lp.done, 0)::numeric / tot.total) * 100)::int ELSE 0 END,
    e.course_group_id,
    g.name
  FROM public.enrollments e
  LEFT JOIN public.profiles p ON p.id = e.user_id
  LEFT JOIN auth.users u ON u.id = e.user_id
  LEFT JOIN public.course_groups g ON g.id = e.course_group_id
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS total
    FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    WHERE m.course_id = _course_id
      AND (
        e.course_group_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.course_group_modules gm
          WHERE gm.group_id = e.course_group_id AND gm.module_id = m.id
        )
      )
  ) tot ON true
  LEFT JOIN LATERAL (
    SELECT count(*)::int AS done
    FROM public.lesson_progress pr
    JOIN public.lessons l ON l.id = pr.lesson_id
    JOIN public.course_modules m ON m.id = l.module_id
    WHERE pr.enrollment_id = e.id AND pr.completed = true AND m.course_id = _course_id
      AND (
        e.course_group_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.course_group_modules gm
          WHERE gm.group_id = e.course_group_id AND gm.module_id = m.id
        )
      )
  ) lp ON true
  WHERE e.course_id = _course_id
  ORDER BY e.purchased_at DESC NULLS LAST;
END;
$$;