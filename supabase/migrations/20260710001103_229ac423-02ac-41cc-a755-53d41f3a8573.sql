GRANT SELECT (id, creator_id, title, description, cover_image_url, price_clp, category_id, status, event_type, event_date, duration_minutes, max_attendees, created_at, updated_at, is_novu_official, slug) ON public.events TO anon;
GRANT SELECT (id, creator_id, title, description, cover_image_url, price_clp, category_id, status, event_type, event_date, duration_minutes, max_attendees, created_at, updated_at, is_novu_official, slug) ON public.events TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;