
REVOKE SELECT (file_url) ON public.ebooks FROM anon, authenticated;
REVOKE SELECT (meeting_url) ON public.events FROM anon, authenticated;

-- El service_role mantiene acceso completo, igual que las RPCs SECURITY DEFINER.
GRANT SELECT (file_url) ON public.ebooks TO service_role;
GRANT SELECT (meeting_url) ON public.events TO service_role;
