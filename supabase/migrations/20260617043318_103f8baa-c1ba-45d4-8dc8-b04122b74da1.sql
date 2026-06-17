
CREATE TABLE public.creator_availability_settings (
  creator_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'America/Santiago',
  session_duration_min int NOT NULL DEFAULT 30 CHECK (session_duration_min BETWEEN 5 AND 480),
  buffer_before_min int NOT NULL DEFAULT 0 CHECK (buffer_before_min >= 0),
  buffer_after_min int NOT NULL DEFAULT 0 CHECK (buffer_after_min >= 0),
  min_notice_hours int NOT NULL DEFAULT 12 CHECK (min_notice_hours >= 0),
  max_days_ahead int NOT NULL DEFAULT 30 CHECK (max_days_ahead BETWEEN 1 AND 365),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_availability_settings TO authenticated;
GRANT SELECT ON public.creator_availability_settings TO anon;
GRANT ALL ON public.creator_availability_settings TO service_role;
ALTER TABLE public.creator_availability_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON public.creator_availability_settings FOR SELECT USING (true);
CREATE POLICY "settings_owner_manage" ON public.creator_availability_settings FOR ALL
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE TRIGGER trg_creator_availability_settings_updated_at BEFORE UPDATE ON public.creator_availability_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.creator_availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);
CREATE INDEX idx_avail_rules_creator_dow ON public.creator_availability_rules(creator_id, day_of_week);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_availability_rules TO authenticated;
GRANT SELECT ON public.creator_availability_rules TO anon;
GRANT ALL ON public.creator_availability_rules TO service_role;
ALTER TABLE public.creator_availability_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules_public_read" ON public.creator_availability_rules FOR SELECT USING (true);
CREATE POLICY "rules_owner_manage" ON public.creator_availability_rules FOR ALL
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());

CREATE TABLE public.one_on_one_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  cover_url text,
  duration_min int NOT NULL DEFAULT 30 CHECK (duration_min BETWEEN 5 AND 480),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  price_clp int NOT NULL DEFAULT 0 CHECK (price_clp >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sessions_creator ON public.one_on_one_sessions(creator_id);
CREATE INDEX idx_sessions_status ON public.one_on_one_sessions(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.one_on_one_sessions TO authenticated;
GRANT SELECT ON public.one_on_one_sessions TO anon;
GRANT ALL ON public.one_on_one_sessions TO service_role;
ALTER TABLE public.one_on_one_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_public_read_published" ON public.one_on_one_sessions FOR SELECT
  USING (status = 'published' OR creator_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "sessions_owner_insert" ON public.one_on_one_sessions FOR INSERT
  WITH CHECK (creator_id = auth.uid());
CREATE POLICY "sessions_owner_update" ON public.one_on_one_sessions FOR UPDATE
  USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "sessions_owner_delete" ON public.one_on_one_sessions FOR DELETE
  USING (creator_id = auth.uid());
CREATE TRIGGER trg_one_on_one_sessions_updated_at BEFORE UPDATE ON public.one_on_one_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.session_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.one_on_one_sessions(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email text,
  guest_name text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  google_event_id text,
  meet_url text,
  ics_token text NOT NULL DEFAULT encode(gen_random_bytes(16),'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  CHECK (end_at > start_at),
  CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);
CREATE INDEX idx_bookings_creator_start ON public.session_bookings(creator_id, start_at);
CREATE INDEX idx_bookings_user ON public.session_bookings(user_id);
CREATE INDEX idx_bookings_session ON public.session_bookings(session_id);
CREATE UNIQUE INDEX uq_bookings_no_overlap_confirmed
  ON public.session_bookings(creator_id, start_at) WHERE status = 'confirmed';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_bookings TO authenticated;
GRANT ALL ON public.session_bookings TO service_role;
ALTER TABLE public.session_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_creator_read" ON public.session_bookings FOR SELECT
  USING (creator_id = auth.uid() OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "bookings_owner_update" ON public.session_bookings FOR UPDATE
  USING (creator_id = auth.uid() OR user_id = auth.uid())
  WITH CHECK (creator_id = auth.uid() OR user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_public_session(_creator_slug text, _session_id uuid)
RETURNS TABLE(
  id uuid, creator_id uuid, title text, description text, cover_url text,
  duration_min int, price_clp int,
  creator_name text, creator_avatar_url text, creator_slug text,
  timezone text, min_notice_hours int, max_days_ahead int,
  buffer_before_min int, buffer_after_min int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.creator_id, s.title, s.description, s.cover_url,
         s.duration_min, s.price_clp,
         p.name, p.avatar_url, p.creator_slug,
         COALESCE(cs.timezone,'America/Santiago'),
         COALESCE(cs.min_notice_hours, 12),
         COALESCE(cs.max_days_ahead, 30),
         COALESCE(cs.buffer_before_min, 0),
         COALESCE(cs.buffer_after_min, 0)
  FROM public.one_on_one_sessions s
  JOIN public.profiles p ON p.id = s.creator_id
  LEFT JOIN public.creator_availability_settings cs ON cs.creator_id = s.creator_id
  WHERE s.id = _session_id
    AND s.status = 'published'
    AND p.creator_slug = _creator_slug
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_my_session_bookings()
RETURNS TABLE(
  id uuid, session_id uuid, session_title text, creator_id uuid, creator_name text,
  start_at timestamptz, end_at timestamptz, status text, meet_url text, ics_token text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, b.session_id, s.title, b.creator_id, p.name,
         b.start_at, b.end_at, b.status, b.meet_url, b.ics_token
  FROM public.session_bookings b
  JOIN public.one_on_one_sessions s ON s.id = b.session_id
  JOIN public.profiles p ON p.id = b.creator_id
  WHERE b.user_id = auth.uid()
  ORDER BY b.start_at DESC
$$;

CREATE OR REPLACE FUNCTION public.get_creator_session_bookings()
RETURNS TABLE(
  id uuid, session_id uuid, session_title text,
  user_id uuid, attendee_name text, attendee_email text,
  start_at timestamptz, end_at timestamptz, status text, meet_url text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT b.id, b.session_id, s.title,
         b.user_id,
         COALESCE(p.name, b.guest_name),
         COALESCE(u.email::text, b.guest_email),
         b.start_at, b.end_at, b.status, b.meet_url
  FROM public.session_bookings b
  JOIN public.one_on_one_sessions s ON s.id = b.session_id
  LEFT JOIN public.profiles p ON p.id = b.user_id
  LEFT JOIN auth.users u ON u.id = b.user_id
  WHERE b.creator_id = auth.uid()
  ORDER BY b.start_at DESC
$$;

CREATE OR REPLACE FUNCTION public.get_creator_availability(_creator_id uuid)
RETURNS TABLE(day_of_week smallint, start_time time, end_time time)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT day_of_week, start_time, end_time
  FROM public.creator_availability_rules
  WHERE creator_id = _creator_id
  ORDER BY day_of_week, start_time
$$;

-- Security fixes: hide sensitive columns from public roles
REVOKE SELECT ON public.ebooks FROM anon, authenticated;
GRANT SELECT (id, creator_id, title, slug, description, cover_image_url, price_clp, status, category_id, created_at, updated_at, is_novu_official)
  ON public.ebooks TO anon, authenticated;

REVOKE SELECT ON public.events FROM anon, authenticated;
GRANT SELECT (id, creator_id, title, slug, description, cover_image_url, event_type, event_date, duration_minutes, max_attendees, price_clp, status, category_id, created_at, updated_at, is_novu_official)
  ON public.events TO anon, authenticated;
