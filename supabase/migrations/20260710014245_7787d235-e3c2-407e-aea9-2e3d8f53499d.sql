-- Ensure public product detail pages can read published products without invoking role-check functions as anon.
GRANT SELECT ON public.courses TO anon, authenticated;
GRANT SELECT ON public.events TO anon, authenticated;
GRANT SELECT ON public.ebooks TO anon, authenticated;
GRANT SELECT ON public.one_on_one_sessions TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ebooks TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.one_on_one_sessions TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.courses FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.events FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.ebooks FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.one_on_one_sessions FROM anon;

GRANT ALL ON public.courses TO service_role;
GRANT ALL ON public.events TO service_role;
GRANT ALL ON public.ebooks TO service_role;
GRANT ALL ON public.one_on_one_sessions TO service_role;

-- Courses
DROP POLICY IF EXISTS "Published courses are viewable by everyone" ON public.courses;
DROP POLICY IF EXISTS "Creators or admins can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Creators can update own courses" ON public.courses;
DROP POLICY IF EXISTS "Creators can delete own courses" ON public.courses;

CREATE POLICY "Published courses are viewable publicly"
ON public.courses
FOR SELECT
TO anon, authenticated
USING (status = 'published');

CREATE POLICY "Creators and admins can view courses"
ON public.courses
FOR SELECT
TO authenticated
USING (creator_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'::public.app_role);

CREATE POLICY "Creators or admins can insert courses"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (
  ((creator_id = auth.uid()) AND public.get_user_role(auth.uid()) = 'creator'::public.app_role)
  OR public.get_user_role(auth.uid()) = 'admin'::public.app_role
);

CREATE POLICY "Creators can update own courses"
ON public.courses
FOR UPDATE
TO authenticated
USING (creator_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'::public.app_role)
WITH CHECK (creator_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'::public.app_role);

CREATE POLICY "Creators can delete own courses"
ON public.courses
FOR DELETE
TO authenticated
USING (creator_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'::public.app_role);

-- Events
DROP POLICY IF EXISTS "Published events are viewable by everyone" ON public.events;
DROP POLICY IF EXISTS "Creators or admins can insert events" ON public.events;
DROP POLICY IF EXISTS "Creators can update own events" ON public.events;
DROP POLICY IF EXISTS "Creators can delete own events" ON public.events;

CREATE POLICY "Published events are viewable publicly"
ON public.events
FOR SELECT
TO anon, authenticated
USING (status = 'published');

CREATE POLICY "Creators and admins can view events"
ON public.events
FOR SELECT
TO authenticated
USING (creator_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'::public.app_role);

CREATE POLICY "Creators or admins can insert events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (
  ((creator_id = auth.uid()) AND public.get_user_role(auth.uid()) = 'creator'::public.app_role)
  OR public.get_user_role(auth.uid()) = 'admin'::public.app_role
);

CREATE POLICY "Creators can update own events"
ON public.events
FOR UPDATE
TO authenticated
USING (creator_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'::public.app_role)
WITH CHECK (creator_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'::public.app_role);

CREATE POLICY "Creators can delete own events"
ON public.events
FOR DELETE
TO authenticated
USING (creator_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'::public.app_role);

-- E-books
DROP POLICY IF EXISTS "Published ebooks are viewable by everyone" ON public.ebooks;
DROP POLICY IF EXISTS "Creators or admins can insert ebooks" ON public.ebooks;
DROP POLICY IF EXISTS "Creators can update own ebooks" ON public.ebooks;
DROP POLICY IF EXISTS "Creators can delete own ebooks" ON public.ebooks;

CREATE POLICY "Published ebooks are viewable publicly"
ON public.ebooks
FOR SELECT
TO anon, authenticated
USING (status = 'published');

CREATE POLICY "Creators and admins can view ebooks"
ON public.ebooks
FOR SELECT
TO authenticated
USING (creator_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'::public.app_role);

CREATE POLICY "Creators or admins can insert ebooks"
ON public.ebooks
FOR INSERT
TO authenticated
WITH CHECK (
  ((creator_id = auth.uid()) AND public.get_user_role(auth.uid()) = 'creator'::public.app_role)
  OR public.get_user_role(auth.uid()) = 'admin'::public.app_role
);

CREATE POLICY "Creators can update own ebooks"
ON public.ebooks
FOR UPDATE
TO authenticated
USING (creator_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'::public.app_role)
WITH CHECK (creator_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'::public.app_role);

CREATE POLICY "Creators can delete own ebooks"
ON public.ebooks
FOR DELETE
TO authenticated
USING (creator_id = auth.uid() OR public.get_user_role(auth.uid()) = 'admin'::public.app_role);

-- One-on-one sessions
DROP POLICY IF EXISTS "sessions_public_read_published" ON public.one_on_one_sessions;
DROP POLICY IF EXISTS "sessions_owner_insert" ON public.one_on_one_sessions;
DROP POLICY IF EXISTS "sessions_owner_update" ON public.one_on_one_sessions;
DROP POLICY IF EXISTS "sessions_owner_delete" ON public.one_on_one_sessions;

CREATE POLICY "Published sessions are viewable publicly"
ON public.one_on_one_sessions
FOR SELECT
TO anon, authenticated
USING (status = 'published');

CREATE POLICY "Creators and admins can view sessions"
ON public.one_on_one_sessions
FOR SELECT
TO authenticated
USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "sessions_owner_insert"
ON public.one_on_one_sessions
FOR INSERT
TO authenticated
WITH CHECK (creator_id = auth.uid());

CREATE POLICY "sessions_owner_update"
ON public.one_on_one_sessions
FOR UPDATE
TO authenticated
USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "sessions_owner_delete"
ON public.one_on_one_sessions
FOR DELETE
TO authenticated
USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));