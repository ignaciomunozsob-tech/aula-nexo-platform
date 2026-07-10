
-- 1. creator_reviews: prevent changing creator_id/reviewer_id via trigger
DROP POLICY IF EXISTS "Users can update own reviews" ON public.creator_reviews;
CREATE POLICY "Users can update own reviews" ON public.creator_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

CREATE OR REPLACE FUNCTION public.prevent_creator_review_reassign()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.creator_id IS DISTINCT FROM OLD.creator_id
     OR NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id THEN
    RAISE EXCEPTION 'creator_id and reviewer_id are immutable';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_prevent_creator_review_reassign ON public.creator_reviews;
CREATE TRIGGER trg_prevent_creator_review_reassign
  BEFORE UPDATE ON public.creator_reviews
  FOR EACH ROW EXECUTE FUNCTION public.prevent_creator_review_reassign();

-- 2. enrollments: prevent user from changing status/course_id/user_id
DROP POLICY IF EXISTS "Users can update own enrollments" ON public.enrollments;
CREATE POLICY "Users can update own enrollments" ON public.enrollments
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.prevent_enrollment_privileged_updates()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  -- Allow service_role/admin to change anything (they bypass RLS anyway or use admin path)
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.course_id IS DISTINCT FROM OLD.course_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'enrollment status/course_id/user_id cannot be changed by user';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_prevent_enrollment_privileged_updates ON public.enrollments;
CREATE TRIGGER trg_prevent_enrollment_privileged_updates
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_enrollment_privileged_updates();

-- 3. creator_2fa_codes: enforce immutability of code/expires_at via trigger
DROP POLICY IF EXISTS "Users can mark own 2FA codes as used" ON public.creator_2fa_codes;
CREATE POLICY "Users can mark own 2FA codes as used" ON public.creator_2fa_codes
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND used = true);

CREATE OR REPLACE FUNCTION public.enforce_2fa_code_immutability()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.code IS DISTINCT FROM OLD.code
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION '2FA code fields are immutable';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_enforce_2fa_code_immutability ON public.creator_2fa_codes;
CREATE TRIGGER trg_enforce_2fa_code_immutability
  BEFORE UPDATE ON public.creator_2fa_codes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_2fa_code_immutability();

-- 4. storage protected-content: add WITH CHECK on UPDATE
DROP POLICY IF EXISTS "protected: owners can update own files" ON storage.objects;
CREATE POLICY "protected: owners can update own files" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'protected-content' AND (auth.uid())::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'protected-content' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 5. SECURITY DEFINER function executability: lock down internal/system functions
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.find_user_id_by_email(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.unban_user_from_course(uuid, uuid) FROM PUBLIC, anon;

-- Trigger-only functions: not callable directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_course_ban() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_course_publish_requires_mp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_paid_publish_requires_mp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_creator_review_reassign() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_enrollment_privileged_updates() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_2fa_code_immutability() FROM PUBLIC, anon, authenticated;

-- email_queue_wake is a trigger function; also revoke direct call
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;

-- Restrict "my"/authenticated-only helpers from anon
REVOKE EXECUTE ON FUNCTION public.get_my_google_connection() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_meta_pixel_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_review_for_creator(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_session_bookings() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_course_editor_paths(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_course_bans(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_course_students(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_event_students(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_course_community_feed(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_course_community_replies(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_creator_session_bookings() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_ebook_file_url(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_event_meeting_url(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_lesson_resource_path_for_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_lesson_video_path_for_owner(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_creator_2fa_valid() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_lesson(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_lesson_module(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.creator_has_mercadopago(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.creator_owns_product(uuid, text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_enrollment(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_course_creator(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_course_banned(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_community_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_community_owner(uuid, uuid) FROM PUBLIC, anon;
