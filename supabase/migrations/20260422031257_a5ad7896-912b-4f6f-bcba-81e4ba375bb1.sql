-- Add NOVU official flag and instructor metadata to courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS is_novu_official boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instructor_name text,
  ADD COLUMN IF NOT EXISTS instructor_bio text,
  ADD COLUMN IF NOT EXISTS instructor_avatar_url text;

-- Add NOVU official flag to ebooks and events too (consistency)
ALTER TABLE public.ebooks
  ADD COLUMN IF NOT EXISTS is_novu_official boolean NOT NULL DEFAULT false;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS is_novu_official boolean NOT NULL DEFAULT false;

-- Index for fast lookup of official content
CREATE INDEX IF NOT EXISTS idx_courses_novu_official
  ON public.courses (is_novu_official, status)
  WHERE is_novu_official = true;

-- Relax INSERT policy so admins can create courses/ebooks/events on behalf of NOVU
DROP POLICY IF EXISTS "Creators can insert own courses" ON public.courses;
CREATE POLICY "Creators or admins can insert courses"
  ON public.courses
  FOR INSERT
  WITH CHECK (
    (creator_id = auth.uid() AND get_user_role(auth.uid()) = 'creator'::app_role)
    OR get_user_role(auth.uid()) = 'admin'::app_role
  );

DROP POLICY IF EXISTS "Creators can insert own ebooks" ON public.ebooks;
CREATE POLICY "Creators or admins can insert ebooks"
  ON public.ebooks
  FOR INSERT
  WITH CHECK (
    (creator_id = auth.uid() AND get_user_role(auth.uid()) = 'creator'::app_role)
    OR get_user_role(auth.uid()) = 'admin'::app_role
  );

DROP POLICY IF EXISTS "Creators can insert own events" ON public.events;
CREATE POLICY "Creators or admins can insert events"
  ON public.events
  FOR INSERT
  WITH CHECK (
    (creator_id = auth.uid() AND get_user_role(auth.uid()) = 'creator'::app_role)
    OR get_user_role(auth.uid()) = 'admin'::app_role
  );