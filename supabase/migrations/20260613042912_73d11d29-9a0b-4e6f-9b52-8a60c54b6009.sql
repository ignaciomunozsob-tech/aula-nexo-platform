
-- PROFILES: revoke table-level SELECT, regrant only non-sensitive columns
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, name, avatar_url, role, creator_slug, bio, links, created_at, updated_at, intro_video_url, interests, onboarding_completed) ON public.profiles TO anon, authenticated;

-- EVENTS: revoke table-level SELECT, regrant only non-sensitive columns (exclude meeting_url)
REVOKE SELECT ON public.events FROM anon, authenticated;
GRANT SELECT (id, creator_id, title, slug, description, cover_image_url, event_type, event_date, duration_minutes, max_attendees, price_clp, status, category_id, created_at, updated_at, is_novu_official) ON public.events TO anon, authenticated;

-- EBOOKS: revoke table-level SELECT, regrant only non-sensitive columns (exclude file_url)
REVOKE SELECT ON public.ebooks FROM anon, authenticated;
GRANT SELECT (id, creator_id, title, slug, description, cover_image_url, price_clp, status, category_id, created_at, updated_at, is_novu_official) ON public.ebooks TO anon, authenticated;
