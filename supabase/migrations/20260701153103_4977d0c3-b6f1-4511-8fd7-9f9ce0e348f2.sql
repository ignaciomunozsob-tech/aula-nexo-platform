-- Re-apply column-level access controls for sensitive storage/meeting paths.
-- Public/authenticated clients may read safe storefront columns only; sensitive paths stay behind protected RPC/edge functions.

-- ebooks.file_url must not be directly readable through the Data API
REVOKE SELECT ON TABLE public.ebooks FROM anon, authenticated;
GRANT SELECT (id, title, slug, description, price_clp, category_id, status, cover_image_url, creator_id, is_novu_official, created_at, updated_at) ON public.ebooks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.ebooks TO authenticated;
GRANT ALL ON TABLE public.ebooks TO service_role;

-- events.meeting_url must not be directly readable through the Data API
REVOKE SELECT ON TABLE public.events FROM anon, authenticated;
GRANT SELECT (id, title, slug, description, price_clp, category_id, status, cover_image_url, duration_minutes, max_attendees, event_date, event_type, creator_id, is_novu_official, created_at, updated_at) ON public.events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.events TO authenticated;
GRANT ALL ON TABLE public.events TO service_role;

-- lesson_resources.file_url must not be directly readable through the Data API
REVOKE SELECT ON TABLE public.lesson_resources FROM anon, authenticated;
GRANT SELECT (id, lesson_id, file_name, created_at) ON public.lesson_resources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.lesson_resources TO authenticated;
GRANT ALL ON TABLE public.lesson_resources TO service_role;