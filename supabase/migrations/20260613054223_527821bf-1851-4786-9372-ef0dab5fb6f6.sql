-- ============================================================
-- creator_plans
-- ============================================================
CREATE TABLE public.creator_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'gratis' CHECK (plan IN ('gratis','creador','pro')),
  plan_inicio timestamptz NOT NULL DEFAULT now(),
  plan_vence timestamptz,
  comision integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_plans TO authenticated;
GRANT ALL ON public.creator_plans TO service_role;

ALTER TABLE public.creator_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators read own plan"
  ON public.creator_plans FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins manage plans"
  ON public.creator_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER trg_creator_plans_updated
  BEFORE UPDATE ON public.creator_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: get my plan (returns default 'gratis' if none)
CREATE OR REPLACE FUNCTION public.get_my_plan()
RETURNS TABLE(plan text, comision integer, plan_vence timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(cp.plan, 'gratis')::text,
         COALESCE(cp.comision, 10),
         cp.plan_vence
  FROM (SELECT 1) x
  LEFT JOIN public.creator_plans cp ON cp.creator_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.get_my_plan() TO authenticated;

-- ============================================================
-- waitlist_pro
-- ============================================================
CREATE TABLE public.waitlist_pro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  source text DEFAULT 'precios_page',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.waitlist_pro TO authenticated;
GRANT INSERT ON public.waitlist_pro TO anon, authenticated;
GRANT ALL ON public.waitlist_pro TO service_role;

ALTER TABLE public.waitlist_pro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
  ON public.waitlist_pro FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins read waitlist"
  ON public.waitlist_pro FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ============================================================
-- Security: hide ebooks.file_url and events.meeting_url from
-- public/normal SELECT — only the existing SECURITY DEFINER
-- RPCs (get_ebook_file_url / get_event_meeting_url) can read.
-- ============================================================
REVOKE SELECT (file_url) ON public.ebooks FROM anon, authenticated;
REVOKE SELECT (meeting_url) ON public.events FROM anon, authenticated;