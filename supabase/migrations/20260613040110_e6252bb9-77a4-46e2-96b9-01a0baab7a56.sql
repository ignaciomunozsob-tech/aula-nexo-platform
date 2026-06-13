REVOKE SELECT (file_url) ON public.ebooks FROM anon, authenticated;
REVOKE SELECT (meeting_url) ON public.events FROM anon, authenticated;
REVOKE SELECT (meta_pixel_id) ON public.profiles FROM anon, authenticated;

GRANT SELECT (file_url) ON public.ebooks TO service_role;
GRANT SELECT (meeting_url) ON public.events TO service_role;
GRANT SELECT (meta_pixel_id) ON public.profiles TO service_role;