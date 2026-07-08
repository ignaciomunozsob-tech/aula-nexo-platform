
-- Grant Data API access to events table (was missing all grants).
-- Exclude meeting_url from direct SELECT — only the get_event_meeting_url RPC exposes it after authorization.
GRANT SELECT (id, creator_id, title, slug, description, cover_image_url, event_type, event_date, duration_minutes, max_attendees, price_clp, status, category_id, created_at, updated_at, is_novu_official) ON public.events TO anon;
GRANT SELECT (id, creator_id, title, slug, description, cover_image_url, event_type, event_date, duration_minutes, max_attendees, price_clp, status, category_id, created_at, updated_at, is_novu_official) ON public.events TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
