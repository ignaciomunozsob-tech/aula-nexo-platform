
-- 1) Hide ebooks.file_url from direct SELECT; keep RPC access (SECURITY DEFINER bypasses column ACL)
REVOKE SELECT (file_url) ON public.ebooks FROM anon, authenticated;

-- 2) Hide events.meeting_url from direct SELECT; keep RPC access
REVOKE SELECT (meeting_url) ON public.events FROM anon, authenticated;

-- 3) Tighten enrollments INSERT: remove pending-as-escape; only allow self-insert for FREE courses.
--    Paid enrollments are created by edge functions using the service_role, which bypasses RLS.
DROP POLICY IF EXISTS "Users can create own enrollments" ON public.enrollments;
CREATE POLICY "Users can self-enroll in free courses"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND status = 'active'
  AND EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = enrollments.course_id
      AND COALESCE(c.price_clp, 0) = 0
      AND c.status = 'published'
  )
);
