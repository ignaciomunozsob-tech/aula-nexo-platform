-- Server-side enforcement of plan rules when publishing a course.
-- Blocks: (a) publishing a paid course without a connected MercadoPago account;
--         (b) publishing more than 2 courses on the Gratis plan.

CREATE OR REPLACE FUNCTION public.enforce_course_publish_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_count int;
  v_has_mp boolean;
BEGIN
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN

    -- Paid product requires MercadoPago
    IF COALESCE(NEW.price_clp, 0) > 0 THEN
      SELECT public.creator_has_mercadopago(NEW.creator_id) INTO v_has_mp;
      IF NOT COALESCE(v_has_mp, false) THEN
        RAISE EXCEPTION 'mercadopago_not_connected'
          USING HINT = 'Conecta tu cuenta de MercadoPago antes de publicar un producto con precio.';
      END IF;
    END IF;

    -- Plan Gratis: máximo 2 cursos publicados
    SELECT COALESCE(cp.plan, 'gratis') INTO v_plan
    FROM (SELECT 1) x
    LEFT JOIN public.creator_plans cp ON cp.creator_id = NEW.creator_id
      AND (cp.plan_vence IS NULL OR cp.plan_vence > now());
    v_plan := COALESCE(v_plan, 'gratis');

    IF v_plan = 'gratis' THEN
      SELECT count(*) INTO v_count
      FROM public.courses
      WHERE creator_id = NEW.creator_id
        AND status = 'published'
        AND id <> NEW.id;
      IF v_count >= 2 THEN
        RAISE EXCEPTION 'plan_limit_courses_gratis'
          USING HINT = 'Tu Plan Gratis permite máximo 2 cursos publicados. Mejora tu plan para publicar más.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_course_publish_rules_trg ON public.courses;
CREATE TRIGGER enforce_course_publish_rules_trg
BEFORE INSERT OR UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.enforce_course_publish_rules();