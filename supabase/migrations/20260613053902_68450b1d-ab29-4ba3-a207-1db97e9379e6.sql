GRANT EXECUTE ON FUNCTION public.has_active_enrollment(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_course_creator(uuid, uuid) TO anon, authenticated;