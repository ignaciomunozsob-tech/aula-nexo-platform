-- ============ EBOOKS: hide file_url from direct SELECT ============
REVOKE SELECT ON public.ebooks FROM anon, authenticated;
GRANT SELECT (id, creator_id, title, slug, description, cover_image_url, price_clp, status, category_id, created_at, updated_at, is_novu_official)
  ON public.ebooks TO anon, authenticated;

-- ============ EVENTS: hide meeting_url from direct SELECT ============
REVOKE SELECT ON public.events FROM anon, authenticated;
GRANT SELECT (id, creator_id, title, slug, description, cover_image_url, event_type, event_date, duration_minutes, max_attendees, price_clp, status, category_id, created_at, updated_at, is_novu_official)
  ON public.events TO anon, authenticated;

-- ============ LESSONS: hide video_url from direct SELECT ============
REVOKE SELECT ON public.lessons FROM anon, authenticated;
GRANT SELECT (id, module_id, title, order_index, type, content_text, duration_minutes, created_at, description)
  ON public.lessons TO anon, authenticated;

-- ============ LESSON_RESOURCES: hide file_url from direct SELECT ============
REVOKE SELECT ON public.lesson_resources FROM anon, authenticated;
GRANT SELECT (id, lesson_id, file_name, created_at)
  ON public.lesson_resources TO anon, authenticated;

-- ============ Owner-only path lookups (for editor) ============
CREATE OR REPLACE FUNCTION public.get_lesson_video_path_for_owner(_lesson_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.video_url
  FROM public.lessons l
  JOIN public.course_modules cm ON cm.id = l.module_id
  WHERE l.id = _lesson_id
    AND (
      public.is_course_creator(auth.uid(), cm.course_id)
      OR public.get_user_role(auth.uid()) = 'admin'::public.app_role
    )
$$;

CREATE OR REPLACE FUNCTION public.get_lesson_resource_path_for_owner(_resource_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.file_url
  FROM public.lesson_resources r
  JOIN public.lessons l ON l.id = r.lesson_id
  JOIN public.course_modules cm ON cm.id = l.module_id
  WHERE r.id = _resource_id
    AND (
      public.is_course_creator(auth.uid(), cm.course_id)
      OR public.get_user_role(auth.uid()) = 'admin'::public.app_role
    )
$$;

CREATE OR REPLACE FUNCTION public.get_course_editor_paths(_course_id uuid)
RETURNS TABLE(lesson_id uuid, video_url text, resource_id uuid, resource_file_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH allowed AS (
    SELECT _course_id AS course_id
    WHERE public.is_course_creator(auth.uid(), _course_id)
       OR public.get_user_role(auth.uid()) = 'admin'::public.app_role
  )
  SELECT l.id, l.video_url, NULL::uuid, NULL::text
  FROM public.lessons l
  JOIN public.course_modules cm ON cm.id = l.module_id
  JOIN allowed a ON a.course_id = cm.course_id
  UNION ALL
  SELECT NULL::uuid, NULL::text, r.id, r.file_url
  FROM public.lesson_resources r
  JOIN public.lessons l ON l.id = r.lesson_id
  JOIN public.course_modules cm ON cm.id = l.module_id
  JOIN allowed a ON a.course_id = cm.course_id
$$;

REVOKE EXECUTE ON FUNCTION public.get_lesson_video_path_for_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_lesson_resource_path_for_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_course_editor_paths(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_lesson_video_path_for_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lesson_resource_path_for_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_editor_paths(uuid) TO authenticated;