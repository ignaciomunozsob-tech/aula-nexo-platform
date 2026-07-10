
-- 1) app_settings: restrict SELECT to admins
DROP POLICY IF EXISTS "Anyone authenticated can read settings" ON public.app_settings;
CREATE POLICY "Admins can read settings" ON public.app_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Lock down SECURITY DEFINER function EXECUTE grants.
-- Revoke PUBLIC EXECUTE from all SECURITY DEFINER functions in public schema.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC', r.proname, r.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', r.proname, r.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated', r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant EXECUTE only where required by app flows.
-- Public (anon + authenticated) callable RPCs — power public storefront pages.
GRANT EXECUTE ON FUNCTION public.get_public_creator_profile(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_creators_by_ids(uuid[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_pixel_id(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_pixel_id_by_id(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_reviews(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_availability(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_session(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_availability(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_checkout_page(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_creator_product(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_public(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_by_token(uuid, text) TO anon, authenticated;

-- Authenticated-only RPCs.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_enrollment(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_course_creator(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_course_banned(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_community_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_creator_2fa_valid() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_lesson(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_lesson_module(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.creator_has_mercadopago(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_community_feed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_community_replies(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_students(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_bans(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_editor_paths(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_students(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_session_bookings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ebook_file_url(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_meeting_url(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lesson_video_path_for_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_lesson_resource_path_for_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_google_connection() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_meta_pixel_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_review_for_creator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_session_bookings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.unban_user_from_course(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.slugify(text) TO anon, authenticated;

-- Trigger functions, queue helpers, and enforcement functions remain PUBLIC-only revoked.
-- (Triggers run as table owner regardless of caller EXECUTE grants; queue helpers are used by service_role via edge functions.)
