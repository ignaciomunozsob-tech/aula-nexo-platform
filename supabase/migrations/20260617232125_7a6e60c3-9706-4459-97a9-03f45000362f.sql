
-- Revoke column-level SELECT on sensitive columns from anon and authenticated.
-- Owners and buyers continue to access via SECURITY DEFINER RPCs:
--   public.get_ebook_file_url(_ebook_id)  and  public.get_event_meeting_url(_event_id)

REVOKE SELECT (file_url) ON public.ebooks FROM anon, authenticated;
REVOKE SELECT (meeting_url) ON public.events FROM anon, authenticated;

-- Service role keeps full access for edge functions and admin code.
GRANT SELECT (file_url) ON public.ebooks TO service_role;
GRANT SELECT (meeting_url) ON public.events TO service_role;
