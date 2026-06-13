
-- 1) Hide protected storage paths from direct REST/SELECT
REVOKE SELECT (video_url) ON public.lessons FROM anon, authenticated;
REVOKE SELECT (file_url)  ON public.lesson_resources FROM anon, authenticated;

-- 2) Tighten event self-registration to free, published events only.
DROP POLICY IF EXISTS "Users can register for events" ON public.event_registrations;
CREATE POLICY "Users self-register for free events"
ON public.event_registrations
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_registrations.event_id
      AND e.status = 'published'
      AND COALESCE(e.price_clp, 0) = 0
  )
);

-- 3) Make get_user_role read from the authoritative user_roles table.
--    Resolution order: admin > creator > student. profiles.role is no longer trusted.
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 0
    WHEN 'creator' THEN 1
    WHEN 'student' THEN 2
    ELSE 3
  END
  LIMIT 1
$$;
