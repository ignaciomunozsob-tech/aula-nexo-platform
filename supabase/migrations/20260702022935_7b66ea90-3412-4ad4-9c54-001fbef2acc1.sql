-- Grant anon read access to safe (non-sensitive) columns of lessons and lesson_resources
-- so unauthenticated visitors can see the public course syllabus. video_url and file_url
-- remain restricted (service_role only) and are served via signed URLs.

GRANT SELECT (id, module_id, title, order_index, type, content_text, duration_minutes, description, created_at)
  ON public.lessons TO anon;

GRANT SELECT (id, lesson_id, file_name, created_at)
  ON public.lesson_resources TO anon;