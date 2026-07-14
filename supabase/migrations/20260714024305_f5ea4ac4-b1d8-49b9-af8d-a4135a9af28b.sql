
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
  CHECK (source IN ('payment','manual'));

ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
  CHECK (source IN ('payment','manual'));

CREATE INDEX IF NOT EXISTS idx_enrollments_course_source ON public.enrollments (course_id, source);
CREATE INDEX IF NOT EXISTS idx_event_registrations_event_source ON public.event_registrations (event_id, source);
