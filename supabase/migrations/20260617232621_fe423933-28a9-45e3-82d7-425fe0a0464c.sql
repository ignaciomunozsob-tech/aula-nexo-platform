
-- 1) Revoke direct SELECT on private path columns; reads go through get-protected-url edge function
REVOKE SELECT (video_url) ON public.lessons FROM anon, authenticated;
GRANT SELECT (video_url) ON public.lessons TO service_role;

REVOKE SELECT (file_url) ON public.lesson_resources FROM anon, authenticated;
GRANT SELECT (file_url) ON public.lesson_resources TO service_role;

-- 2) session_bookings: explicit SELECT policy for the booking user and the creator only.
--    Anonymous guests who booked still use get_booking_by_token (SECURITY DEFINER) with ICS token.
CREATE POLICY "bookings_owner_select"
  ON public.session_bookings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR creator_id = auth.uid());

-- 3) Defense in depth on profiles.role: prevent any user from upgrading their own role.
--    Authorization already uses the user_roles table; this trigger only blocks tampering
--    via direct REST updates to profiles.role. Admins keep service_role bypass.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_self_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.role IS DISTINCT FROM OLD.role
     AND NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'role cannot be changed via profile update';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_self_change_trg ON public.profiles;
CREATE TRIGGER prevent_profile_role_self_change_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_self_change();

-- 4) Email queue helper functions: set search_path and lock down EXECUTE.
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- 5) Public bucket: drop broad SELECT policy that enables listing all files.
--    Files in 'course-assets' remain accessible via their public URL (bucket is public),
--    but the Storage API can no longer enumerate every object in the bucket.
DROP POLICY IF EXISTS "Course assets are publicly accessible" ON storage.objects;
