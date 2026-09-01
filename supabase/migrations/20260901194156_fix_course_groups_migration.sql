-- 1. Fix RLS policies to allow students and public to see course groups
DROP POLICY IF EXISTS "Creators can view own course groups" ON public.course_groups;
CREATE POLICY "Course groups are viewable by everyone" ON public.course_groups
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Creators can view own group modules" ON public.course_group_modules;
CREATE POLICY "Course group modules are viewable by everyone" ON public.course_group_modules
  FOR SELECT USING (true);

-- 2. Backfill existing courses with default groups
DO $$
DECLARE
    course_rec RECORD;
    new_group_id UUID;
BEGIN
    FOR course_rec IN 
        SELECT id FROM public.courses 
        WHERE id NOT IN (SELECT course_id FROM public.course_groups WHERE is_default = true)
    LOOP
        INSERT INTO public.course_groups (course_id, name, price_clp, is_default)
        VALUES (course_rec.id, 'Acceso general', NULL, true)
        RETURNING id INTO new_group_id;

        -- Link existing modules to the new default group
        INSERT INTO public.course_group_modules (group_id, module_id)
        SELECT new_group_id, id 
        FROM public.course_modules 
        WHERE course_id = course_rec.id;
        
        -- Backfill existing enrollments for this course
        UPDATE public.enrollments 
        SET course_group_id = new_group_id 
        WHERE course_id = course_rec.id AND course_group_id IS NULL;
        
        -- Backfill existing orders for this course
        UPDATE public.orders
        SET course_group_id = new_group_id
        WHERE product_id = course_rec.id AND product_type = 'course' AND course_group_id IS NULL;
    END LOOP;
END $$;

-- 3. Ensure all enrollments and orders for courses that already had a default group are linked
UPDATE public.enrollments e
SET course_group_id = cg.id
FROM public.course_groups cg
WHERE e.course_id = cg.course_id 
  AND cg.is_default = true 
  AND e.course_group_id IS NULL;

UPDATE public.orders o
SET course_group_id = cg.id
FROM public.course_groups cg
WHERE o.product_id = cg.course_id 
  AND o.product_type = 'course'
  AND cg.is_default = true 
  AND o.course_group_id IS NULL;

-- 4. Add trigger to automatically add new modules to the default course group
CREATE OR REPLACE FUNCTION public.sync_module_to_default_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_group_id uuid;
BEGIN
  SELECT id INTO default_group_id
  FROM public.course_groups
  WHERE course_id = NEW.course_id AND is_default = true;

  IF default_group_id IS NOT NULL THEN
    INSERT INTO public.course_group_modules (group_id, module_id)
    VALUES (default_group_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_module_to_default_group_trg ON public.course_modules;
CREATE TRIGGER sync_module_to_default_group_trg
  AFTER INSERT ON public.course_modules
  FOR EACH ROW EXECUTE FUNCTION public.sync_module_to_default_group();

-- 5. Re-apply enrollment protection trigger to ensure it uses the updated function
DROP TRIGGER IF EXISTS trg_prevent_enrollment_privileged_updates ON public.enrollments;
CREATE TRIGGER trg_prevent_enrollment_privileged_updates
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.prevent_enrollment_privileged_updates();

GRANT EXECUTE ON FUNCTION public.sync_module_to_default_group() TO service_role;
