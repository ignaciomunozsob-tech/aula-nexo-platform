
-- Superadmin helper
CREATE OR REPLACE FUNCTION public.is_platform_superadmin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) = 'ignaciomunozsob@gmail.com'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_superadmin(uuid) TO anon, authenticated, service_role;

-- Remove a student from a course (creator, admin or superadmin)
CREATE OR REPLACE FUNCTION public.remove_course_student(_course_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_enrollment uuid;
BEGIN
  SELECT creator_id INTO v_owner FROM public.courses WHERE id = _course_id;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Curso no encontrado';
  END IF;

  IF NOT (
    v_owner = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_platform_superadmin(auth.uid())
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT id INTO v_enrollment
  FROM public.enrollments
  WHERE course_id = _course_id AND user_id = _user_id;

  IF v_enrollment IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM public.lesson_progress WHERE enrollment_id = v_enrollment;
  DELETE FROM public.enrollments WHERE id = v_enrollment;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_course_student(uuid, uuid) TO authenticated, service_role;

-- Pin creator/product fields when a reviewer edits their own review
DROP POLICY IF EXISTS "Users can update own reviews" ON public.creator_reviews;
CREATE POLICY "Users can update own reviews"
ON public.creator_reviews
FOR UPDATE
TO authenticated
USING (reviewer_id = auth.uid())
WITH CHECK (
  reviewer_id = auth.uid()
  AND creator_id = (SELECT r.creator_id FROM public.creator_reviews r WHERE r.id = creator_reviews.id)
  AND product_id IS NOT DISTINCT FROM (SELECT r.product_id FROM public.creator_reviews r WHERE r.id = creator_reviews.id)
  AND product_type IS NOT DISTINCT FROM (SELECT r.product_type FROM public.creator_reviews r WHERE r.id = creator_reviews.id)
  AND verified_purchase IS NOT DISTINCT FROM (SELECT r.verified_purchase FROM public.creator_reviews r WHERE r.id = creator_reviews.id)
);
