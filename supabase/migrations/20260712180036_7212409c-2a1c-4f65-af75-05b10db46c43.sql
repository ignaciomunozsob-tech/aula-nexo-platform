-- Add Bunny fields to lessons
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS bunny_video_id text,
  ADD COLUMN IF NOT EXISTS bunny_status text NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS video_source text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS bunny_migrated_at timestamptz;

-- Backfill video_source for existing rows
UPDATE public.lessons
   SET video_source = CASE
     WHEN video_url IS NULL OR video_url = '' THEN 'legacy'
     WHEN video_url ~* '^https?://' THEN 'external'
     ELSE 'legacy'
   END
 WHERE video_source = 'legacy';

-- Migration jobs table (admin only)
CREATE TABLE IF NOT EXISTS public.video_migration_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- pending|running|done|error
  error_message text,
  bunny_video_id text,
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_migration_jobs TO authenticated;
GRANT ALL ON public.video_migration_jobs TO service_role;

ALTER TABLE public.video_migration_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage video migration jobs"
  ON public.video_migration_jobs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_video_migration_jobs_updated
  BEFORE UPDATE ON public.video_migration_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_video_migration_jobs_status
  ON public.video_migration_jobs(status);
CREATE INDEX IF NOT EXISTS idx_lessons_video_source
  ON public.lessons(video_source);