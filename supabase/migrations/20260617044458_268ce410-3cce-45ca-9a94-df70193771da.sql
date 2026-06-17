
-- 1) Per-service availability settings on one_on_one_sessions
ALTER TABLE public.one_on_one_sessions
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Santiago',
  ADD COLUMN IF NOT EXISTS buffer_before_min int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buffer_after_min int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_notice_hours int NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS max_days_ahead int NOT NULL DEFAULT 30;

-- 2) Per-service weekly rules
CREATE TABLE IF NOT EXISTS public.session_availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.one_on_one_sessions(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_session_availability_rules_session ON public.session_availability_rules(session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_availability_rules TO authenticated;
GRANT SELECT ON public.session_availability_rules TO anon;
GRANT ALL ON public.session_availability_rules TO service_role;

ALTER TABLE public.session_availability_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view rules of published sessions" ON public.session_availability_rules;
CREATE POLICY "Public can view rules of published sessions"
ON public.session_availability_rules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.one_on_one_sessions s
    WHERE s.id = session_availability_rules.session_id
      AND (s.status = 'published' OR s.creator_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Creators manage rules of their sessions" ON public.session_availability_rules;
CREATE POLICY "Creators manage rules of their sessions"
ON public.session_availability_rules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.one_on_one_sessions s
    WHERE s.id = session_availability_rules.session_id
      AND s.creator_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.one_on_one_sessions s
    WHERE s.id = session_availability_rules.session_id
      AND s.creator_id = auth.uid()
  )
);

-- 3) Public RPC: get per-session availability (settings + rules) without leaking owner-only data
CREATE OR REPLACE FUNCTION public.get_session_availability(_session_id uuid)
RETURNS TABLE (
  timezone text,
  duration_min int,
  buffer_before_min int,
  buffer_after_min int,
  min_notice_hours int,
  max_days_ahead int,
  rules jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH s AS (
    SELECT * FROM public.one_on_one_sessions WHERE id = _session_id
  ),
  per_rules AS (
    SELECT json_agg(json_build_object('day_of_week', r.day_of_week, 'start_time', r.start_time, 'end_time', r.end_time) ORDER BY r.day_of_week, r.start_time) AS arr
    FROM public.session_availability_rules r WHERE r.session_id = _session_id
  ),
  global_rules AS (
    SELECT json_agg(json_build_object('day_of_week', r.day_of_week, 'start_time', r.start_time, 'end_time', r.end_time) ORDER BY r.day_of_week, r.start_time) AS arr
    FROM public.creator_availability_rules r
    WHERE r.creator_id = (SELECT creator_id FROM s)
  )
  SELECT
    (SELECT timezone FROM s),
    (SELECT duration_min FROM s),
    (SELECT buffer_before_min FROM s),
    (SELECT buffer_after_min FROM s),
    (SELECT min_notice_hours FROM s),
    (SELECT max_days_ahead FROM s),
    COALESCE((SELECT arr FROM per_rules), (SELECT arr FROM global_rules), '[]'::json)::jsonb
$$;

-- 4) Security: revoke public read on sensitive columns
REVOKE SELECT (file_url) ON public.ebooks FROM anon, authenticated;
REVOKE SELECT (meeting_url) ON public.events FROM anon, authenticated;
-- Grant back to creator/admin paths is unnecessary since existing RPCs use SECURITY DEFINER.
-- Service role keeps full access.
