
GRANT SELECT (video_url) ON public.lessons TO authenticated;
GRANT SELECT (file_url)  ON public.lesson_resources TO authenticated;

ALTER TABLE public.lessons DROP COLUMN IF EXISTS has_video;
ALTER TABLE public.lesson_resources DROP COLUMN IF EXISTS has_file;
