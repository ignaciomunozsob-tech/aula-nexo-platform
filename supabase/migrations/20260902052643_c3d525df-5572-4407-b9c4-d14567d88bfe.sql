REVOKE EXECUTE ON FUNCTION public.enforce_one_free_session_per_creator() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_one_free_session_per_creator() TO service_role;