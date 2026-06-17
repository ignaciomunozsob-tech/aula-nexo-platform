-- 1) session_bookings: drop broad SELECT, expose via RPCs only
DROP POLICY IF EXISTS bookings_creator_read ON public.session_bookings;
REVOKE SELECT ON public.session_bookings FROM anon, authenticated;

-- RPC for booking success page (works for guests via ics_token)
CREATE OR REPLACE FUNCTION public.get_booking_by_token(_id uuid, _token text)
RETURNS TABLE(
  id uuid,
  start_at timestamptz,
  end_at timestamptz,
  meet_url text,
  ics_token text,
  session_id uuid,
  session_title text,
  session_description text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, b.start_at, b.end_at, b.meet_url, b.ics_token,
         b.session_id, s.title, s.description
  FROM public.session_bookings b
  JOIN public.one_on_one_sessions s ON s.id = b.session_id
  WHERE b.id = _id
    AND b.ics_token IS NOT NULL
    AND b.ics_token = _token
$$;
GRANT EXECUTE ON FUNCTION public.get_booking_by_token(uuid, text) TO anon, authenticated;

-- Keep UPDATE access for owners/creators (already restricted via bookings_owner_update)
-- No INSERT policy: only service_role (edge functions) can create bookings

-- 2) creator_availability_rules: scope public read to creators with at least one published session
DROP POLICY IF EXISTS rules_public_read ON public.creator_availability_rules;
CREATE POLICY rules_public_read ON public.creator_availability_rules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.one_on_one_sessions s
      WHERE s.creator_id = creator_availability_rules.creator_id
        AND s.status = 'published'
    )
  );

-- 3) creator_availability_settings: scope public read similarly
DROP POLICY IF EXISTS settings_public_read ON public.creator_availability_settings;
CREATE POLICY settings_public_read ON public.creator_availability_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.one_on_one_sessions s
      WHERE s.creator_id = creator_availability_settings.creator_id
        AND s.status = 'published'
    )
  );

-- 4) page_views INSERT: replace permissive WITH CHECK (true) with column-based validation
DROP POLICY IF EXISTS "Anyone can insert page views" ON public.page_views;
CREATE POLICY "Anyone can insert page views"
  ON public.page_views FOR INSERT
  WITH CHECK (
    type IN ('creator_profile', 'course')
    AND ref_id IS NOT NULL
  );
