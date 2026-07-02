-- Keep sensitive media/meeting columns hidden from direct Data API reads.
-- Table-level SELECT grants expose every column, so remove table-level SELECT and
-- re-apply column-level SELECT only for safe public/editor metadata.

-- Lessons: no direct SELECT on video_url.
REVOKE SELECT ON public.lessons FROM anon, authenticated;
GRANT SELECT (id, module_id, title, order_index, type, content_text, duration_minutes, created_at, description)
ON public.lessons TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
REVOKE SELECT (video_url) ON public.lessons FROM anon, authenticated;

-- Lesson resources: no direct SELECT on file_url.
REVOKE SELECT ON public.lesson_resources FROM anon, authenticated;
GRANT SELECT (id, lesson_id, file_name, created_at)
ON public.lesson_resources TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lesson_resources TO authenticated;
GRANT ALL ON public.lesson_resources TO service_role;
REVOKE SELECT (file_url) ON public.lesson_resources FROM anon, authenticated;

-- Ebooks: public/product metadata only, no direct file_url.
REVOKE SELECT ON public.ebooks FROM anon, authenticated;
GRANT SELECT (id, creator_id, title, slug, description, cover_image_url, price_clp, status, category_id, created_at, updated_at, is_novu_official)
ON public.ebooks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ebooks TO authenticated;
GRANT ALL ON public.ebooks TO service_role;
REVOKE SELECT (file_url) ON public.ebooks FROM anon, authenticated;

-- Events: public/event metadata only, no direct meeting_url.
REVOKE SELECT ON public.events FROM anon, authenticated;
GRANT SELECT (id, creator_id, title, slug, description, cover_image_url, event_type, event_date, duration_minutes, max_attendees, price_clp, status, category_id, created_at, updated_at, is_novu_official)
ON public.events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
REVOKE SELECT (meeting_url) ON public.events FROM anon, authenticated;