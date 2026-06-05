-- 1. PROFILES: prevent users from escalating their own role
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
);

-- 2. ENROLLMENTS: prevent users from self-activating (changing status)
DROP POLICY IF EXISTS "Users can update own enrollments" ON public.enrollments;
CREATE POLICY "Users can update own enrollments" ON public.enrollments
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND status = (SELECT e.status FROM public.enrollments e WHERE e.id = enrollments.id)
);

-- 3. EVENTS: hide meeting_url from public SELECT; expose only via SECURITY DEFINER function
REVOKE SELECT (meeting_url) ON public.events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_event_meeting_url(_event_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.meeting_url
  FROM public.events e
  WHERE e.id = _event_id
    AND (
      e.creator_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.event_registrations r
        WHERE r.event_id = e.id AND r.user_id = auth.uid()
      )
      OR public.get_user_role(auth.uid()) = 'admin'::app_role
    )
$$;

GRANT EXECUTE ON FUNCTION public.get_event_meeting_url(uuid) TO authenticated;

-- 4. EBOOKS: hide file_url from public SELECT; expose only via SECURITY DEFINER function
REVOKE SELECT (file_url) ON public.ebooks FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_ebook_file_url(_ebook_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.file_url
  FROM public.ebooks e
  WHERE e.id = _ebook_id
    AND (
      e.creator_id = auth.uid()
      OR public.get_user_role(auth.uid()) = 'admin'::app_role
    )
$$;

GRANT EXECUTE ON FUNCTION public.get_ebook_file_url(uuid) TO authenticated;

-- 5. CREATOR_2FA_CODES: explicit deny-all INSERT from client (service role bypasses RLS)
CREATE POLICY "No client inserts of 2FA codes" ON public.creator_2fa_codes
FOR INSERT
TO authenticated, anon
WITH CHECK (false);