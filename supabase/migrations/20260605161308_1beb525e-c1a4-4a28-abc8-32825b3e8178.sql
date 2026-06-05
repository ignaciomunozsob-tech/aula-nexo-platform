
-- 1) Revoke column-level SELECT on sensitive URLs
REVOKE SELECT (file_url) ON public.ebooks FROM anon, authenticated;
REVOKE SELECT (meeting_url) ON public.events FROM anon, authenticated;

-- 2) Enrollments: restrict self-enroll to free courses only
DROP POLICY IF EXISTS "Users can create own enrollments" ON public.enrollments;
CREATE POLICY "Users can create own enrollments"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    status = 'pending'
    OR EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id AND COALESCE(c.price_clp, 0) = 0
    )
  )
);

-- 3) Lock down 2FA codes UPDATE: users can only mark a code as used; cannot unset used or change expiry
DROP POLICY IF EXISTS "Users can update own 2FA codes" ON public.creator_2fa_codes;
CREATE POLICY "Users can mark own 2FA codes as used"
ON public.creator_2fa_codes
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND used = true
  AND expires_at = (SELECT c.expires_at FROM public.creator_2fa_codes c WHERE c.id = creator_2fa_codes.id)
  AND code = (SELECT c.code FROM public.creator_2fa_codes c WHERE c.id = creator_2fa_codes.id)
);

-- 4) Orders: explicit deny for client writes (only service role writes)
CREATE POLICY "Deny client inserts on orders"
ON public.orders
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Deny client updates on orders"
ON public.orders
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny client deletes on orders"
ON public.orders
FOR DELETE
TO authenticated, anon
USING (false);

-- 5) student_creation_logs: explicit deny for client writes
CREATE POLICY "Deny client inserts on student_creation_logs"
ON public.student_creation_logs
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Deny client updates on student_creation_logs"
ON public.student_creation_logs
FOR UPDATE
TO authenticated, anon
USING (false)
WITH CHECK (false);

CREATE POLICY "Deny client deletes on student_creation_logs"
ON public.student_creation_logs
FOR DELETE
TO authenticated, anon
USING (false);
