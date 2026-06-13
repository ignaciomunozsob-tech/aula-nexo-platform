
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS has_video boolean
  GENERATED ALWAYS AS (video_url IS NOT NULL AND length(video_url) > 0) STORED;

ALTER TABLE public.lesson_resources
  ADD COLUMN IF NOT EXISTS has_file boolean
  GENERATED ALWAYS AS (file_url IS NOT NULL AND length(file_url) > 0) STORED;
