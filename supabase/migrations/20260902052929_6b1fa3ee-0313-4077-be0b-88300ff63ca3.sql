REVOKE ALL ON FUNCTION public.enforce_one_free_session_per_creator() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_one_free_session_per_creator() FROM anon, authenticated;