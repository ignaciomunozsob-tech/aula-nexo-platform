
-- 1) Column-level revokes for sensitive columns
REVOKE SELECT (meeting_url) ON public.events FROM anon, authenticated;
REVOKE SELECT (file_url)    ON public.ebooks FROM anon, authenticated;
REVOKE SELECT (meta_pixel_id) ON public.profiles FROM anon, authenticated;

-- Re-grant SELECT on all OTHER columns explicitly (since column revokes only affect listed cols,
-- other column privileges remain intact — no need to re-grant).
-- But UPDATE on these columns must remain for authenticated owners (RLS still enforces row ownership):
GRANT UPDATE (meeting_url) ON public.events  TO authenticated;
GRANT UPDATE (file_url)    ON public.ebooks  TO authenticated;
GRANT UPDATE (meta_pixel_id) ON public.profiles TO authenticated;

-- 2) Lock down SECURITY DEFINER helpers that should NEVER be called directly by clients
-- (used only by RLS / triggers / edge functions with service_role)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_course_creator(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_active_enrollment(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_community_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.creator_has_mercadopago(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_user_id_by_email(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- These RPCs are intentionally callable by signed-in users only (no anon)
REVOKE EXECUTE ON FUNCTION public.get_my_meta_pixel_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_ebook_file_url(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_event_meeting_url(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_course_students(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_event_students(uuid) FROM anon;

-- get_order_public and get_creator_pixel_id(_by_id|_by_slug) intentionally remain callable
-- by anon for guest checkout / public storefront pixel injection.
