REVOKE EXECUTE ON FUNCTION public.get_my_google_connection() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_google_connection() TO authenticated;