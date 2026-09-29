CREATE OR REPLACE FUNCTION public.normalize_enrollment_default_group()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.course_group_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.course_groups g WHERE g.id = NEW.course_group_id AND g.is_default
  ) THEN
    NEW.course_group_id := NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_normalize_enrollment_default_group ON public.enrollments;
CREATE TRIGGER trg_normalize_enrollment_default_group
BEFORE INSERT OR UPDATE OF course_group_id ON public.enrollments
FOR EACH ROW EXECUTE FUNCTION public.normalize_enrollment_default_group();

UPDATE public.enrollments e SET course_group_id = NULL
FROM public.course_groups g WHERE g.id = e.course_group_id AND g.is_default;

CREATE OR REPLACE FUNCTION public.add_module_to_default_group()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.course_group_modules (group_id, module_id)
  SELECT g.id, NEW.id FROM public.course_groups g
  WHERE g.course_id = NEW.course_id AND g.is_default
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_add_module_to_default_group ON public.course_modules;
CREATE TRIGGER trg_add_module_to_default_group
AFTER INSERT ON public.course_modules
FOR EACH ROW EXECUTE FUNCTION public.add_module_to_default_group();

INSERT INTO public.course_group_modules (group_id, module_id)
SELECT g.id, m.id FROM public.course_groups g
JOIN public.course_modules m ON m.course_id = g.course_id
WHERE g.is_default
ON CONFLICT DO NOTHING;

REVOKE EXECUTE ON FUNCTION public.normalize_enrollment_default_group() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.add_module_to_default_group() FROM anon, authenticated, public;