-- Course groups / cohorts
CREATE TABLE public.course_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_clp integer,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT course_groups_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT course_groups_price_non_negative CHECK (price_clp IS NULL OR price_clp >= 0)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_groups TO authenticated;
GRANT ALL ON public.course_groups TO service_role;
ALTER TABLE public.course_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own course groups" ON public.course_groups
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_groups.course_id
        AND (c.creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  );
CREATE POLICY "Creators can create own course groups" ON public.course_groups
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_groups.course_id
        AND (c.creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  );
CREATE POLICY "Creators can update own course groups" ON public.course_groups
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_groups.course_id
        AND (c.creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_groups.course_id
        AND (c.creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  );
CREATE POLICY "Creators can delete own course groups" ON public.course_groups
  FOR DELETE TO authenticated
  USING (
    is_default = false
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_groups.course_id
        AND (c.creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  );

CREATE TABLE public.course_group_modules (
  group_id uuid NOT NULL REFERENCES public.course_groups(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, module_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_group_modules TO authenticated;
GRANT ALL ON public.course_group_modules TO service_role;
ALTER TABLE public.course_group_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own group modules" ON public.course_group_modules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_groups g
      JOIN public.courses c ON c.id = g.course_id
      JOIN public.course_modules m ON m.id = course_group_modules.module_id AND m.course_id = g.course_id
      WHERE g.id = course_group_modules.group_id
        AND (c.creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  );
CREATE POLICY "Creators can create own group modules" ON public.course_group_modules
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.course_groups g
      JOIN public.courses c ON c.id = g.course_id
      JOIN public.course_modules m ON m.id = course_group_modules.module_id AND m.course_id = g.course_id
      WHERE g.id = course_group_modules.group_id
        AND (c.creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  );
CREATE POLICY "Creators can delete own group modules" ON public.course_group_modules
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_groups g
      JOIN public.courses c ON c.id = g.course_id
      JOIN public.course_modules m ON m.id = course_group_modules.module_id AND m.course_id = g.course_id
      WHERE g.id = course_group_modules.group_id
        AND (c.creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  );

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS course_group_id uuid REFERENCES public.course_groups(id) ON DELETE SET NULL;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS course_group_id uuid REFERENCES public.course_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_course_groups_course_id ON public.course_groups(course_id);
CREATE INDEX IF NOT EXISTS idx_course_group_modules_module_id ON public.course_group_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_group_id ON public.enrollments(course_group_id);
CREATE INDEX IF NOT EXISTS idx_orders_course_group_id ON public.orders(course_group_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_groups_one_default_per_course
  ON public.course_groups(course_id) WHERE is_default = true;

CREATE OR REPLACE FUNCTION public.update_course_group_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_course_groups_updated_at ON public.course_groups;
CREATE TRIGGER update_course_groups_updated_at
  BEFORE UPDATE ON public.course_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_course_group_updated_at();

CREATE OR REPLACE FUNCTION public.create_default_course_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_id uuid;
BEGIN
  INSERT INTO public.course_groups (course_id, name, price_clp, is_default)
  VALUES (NEW.id, 'Acceso general', NULL, true)
  RETURNING id INTO group_id;

  INSERT INTO public.course_group_modules (group_id, module_id)
  SELECT group_id, m.id
  FROM public.course_modules m
  WHERE m.course_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_default_course_group_after_course ON public.courses;
CREATE TRIGGER create_default_course_group_after_course
  AFTER INSERT ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.create_default_course_group();

CREATE OR REPLACE FUNCTION public.prevent_enrollment_privileged_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.course_id IS DISTINCT FROM OLD.course_id
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.course_group_id IS DISTINCT FROM OLD.course_group_id THEN
    RAISE EXCEPTION 'enrollment privileged fields cannot be changed by user';
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_course_group_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_default_course_group() TO service_role;
GRANT EXECUTE ON FUNCTION public.prevent_enrollment_privileged_updates() TO service_role;