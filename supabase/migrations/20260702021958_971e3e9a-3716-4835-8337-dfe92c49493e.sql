-- Fix lesson/resource editor permissions while keeping protected media columns hidden.
-- The creator editor needs to read non-sensitive lesson/resource metadata and RLS
-- policies need safe owner checks that do not require direct SELECT on protected columns.

-- Lessons: allow Data API access only to non-sensitive columns.
REVOKE SELECT ON public.lessons FROM anon, authenticated;
GRANT SELECT (id, module_id, title, order_index, type, content_text, duration_minutes, created_at, description)
ON public.lessons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
REVOKE SELECT (video_url) ON public.lessons FROM anon, authenticated;

-- Lesson resources: allow metadata reads but keep file_url hidden from direct Data API reads.
REVOKE SELECT ON public.lesson_resources FROM anon, authenticated;
GRANT SELECT (id, lesson_id, file_name, created_at)
ON public.lesson_resources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_resources TO authenticated;
GRANT ALL ON public.lesson_resources TO service_role;
REVOKE SELECT (file_url) ON public.lesson_resources FROM anon, authenticated;

-- Helper used by RLS policies so write/delete checks do not fail because sensitive
-- table reads are intentionally column-restricted.
CREATE OR REPLACE FUNCTION public.can_manage_lesson(_lesson_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lessons l
    JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.courses c ON c.id = m.course_id
    WHERE l.id = _lesson_id
      AND (
        c.creator_id = auth.uid()
        OR public.get_user_role(auth.uid()) = 'admin'::public.app_role
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_lesson_module(_module_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.course_modules m
    JOIN public.courses c ON c.id = m.course_id
    WHERE m.id = _module_id
      AND (
        c.creator_id = auth.uid()
        OR public.get_user_role(auth.uid()) = 'admin'::public.app_role
      )
  )
$$;

-- Restrict direct execution of internal helper functions.
REVOKE EXECUTE ON FUNCTION public.can_manage_lesson(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_lesson_module(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_lesson(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_lesson_module(uuid) TO authenticated, service_role;

-- Replace lesson policies with versions that use the helper, avoiding direct
-- table reads that break under column-level permissions.
DROP POLICY IF EXISTS "Creators can delete lessons" ON public.lessons;
DROP POLICY IF EXISTS "Creators can manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Creators can update lessons" ON public.lessons;

CREATE POLICY "Creators can create lessons"
ON public.lessons
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_lesson_module(module_id));

CREATE POLICY "Creators can update lessons"
ON public.lessons
FOR UPDATE
TO authenticated
USING (public.can_manage_lesson(id))
WITH CHECK (public.can_manage_lesson_module(module_id));

CREATE POLICY "Creators can delete lessons"
ON public.lessons
FOR DELETE
TO authenticated
USING (public.can_manage_lesson(id));

-- Replace resource management policy with explicit commands and secure helper checks.
DROP POLICY IF EXISTS "Creators can manage resources" ON public.lesson_resources;

CREATE POLICY "Creators can create lesson resources"
ON public.lesson_resources
FOR INSERT
TO authenticated
WITH CHECK (public.can_manage_lesson(lesson_id));

CREATE POLICY "Creators can update lesson resources"
ON public.lesson_resources
FOR UPDATE
TO authenticated
USING (public.can_manage_lesson(lesson_id))
WITH CHECK (public.can_manage_lesson(lesson_id));

CREATE POLICY "Creators can delete lesson resources"
ON public.lesson_resources
FOR DELETE
TO authenticated
USING (public.can_manage_lesson(lesson_id));

-- Ensure ebook/event sensitive columns remain hidden while public metadata stays readable.
REVOKE SELECT ON public.ebooks FROM anon, authenticated;
GRANT SELECT (id, creator_id, title, slug, description, cover_image_url, price_clp, status, category_id, created_at, updated_at, is_novu_official)
ON public.ebooks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ebooks TO authenticated;
GRANT ALL ON public.ebooks TO service_role;
REVOKE SELECT (file_url) ON public.ebooks FROM anon, authenticated;

REVOKE SELECT ON public.events FROM anon, authenticated;
GRANT SELECT (id, creator_id, title, slug, description, cover_image_url, event_type, event_date, duration_minutes, max_attendees, price_clp, status, category_id, created_at, updated_at, is_novu_official)
ON public.events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
REVOKE SELECT (meeting_url) ON public.events FROM anon, authenticated;