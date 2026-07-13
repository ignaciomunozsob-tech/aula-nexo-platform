
-- Grant EXECUTE on security-definer helper functions used inside RLS policies
-- to anon and authenticated so public product pages load in incognito mode.
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_enrollment(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_course_creator(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_course_banned(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_community_owner(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creator_owns_product(uuid, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creator_has_mercadopago(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_lesson(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_lesson_module(uuid) TO anon, authenticated;

-- Public resolver RPCs used by product pages
GRANT EXECUTE ON FUNCTION public.get_public_creator_profile(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_creators_by_ids(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_pixel_id(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_pixel_id_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_session(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_checkout_page(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_creator_product(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_reviews(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_availability(uuid) TO anon, authenticated;
