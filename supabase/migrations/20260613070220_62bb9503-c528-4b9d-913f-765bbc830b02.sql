
CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  plan text NOT NULL CHECK (plan IN ('creador','pro')),
  ciclo text NOT NULL CHECK (ciclo IN ('mensual','anual')),
  metodo text NOT NULL CHECK (metodo IN ('mercadopago','transferencia')),
  documento text NOT NULL CHECK (documento IN ('boleta','factura')),
  rut_empresa text,
  razon_social text,
  giro text,
  direccion text,
  amount_neto_clp integer NOT NULL,
  amount_total_clp integer NOT NULL,
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment','pending_transfer','paid','active','cancelled','rejected')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.subscription_requests TO authenticated;
GRANT ALL ON public.subscription_requests TO service_role;

ALTER TABLE public.subscription_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creator views own requests" ON public.subscription_requests;
CREATE POLICY "Creator views own requests"
  ON public.subscription_requests FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Creator inserts own requests" ON public.subscription_requests;
CREATE POLICY "Creator inserts own requests"
  ON public.subscription_requests FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Admin updates requests" ON public.subscription_requests;
CREATE POLICY "Admin updates requests"
  ON public.subscription_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS set_sub_requests_updated_at ON public.subscription_requests;
CREATE TRIGGER set_sub_requests_updated_at
  BEFORE UPDATE ON public.subscription_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update course publish trigger with new plan limits
CREATE OR REPLACE FUNCTION public.enforce_course_publish_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_plan text;
  v_count int;
  v_limit int;
  v_has_mp boolean;
BEGIN
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN

    IF COALESCE(NEW.price_clp, 0) > 0 THEN
      SELECT public.creator_has_mercadopago(NEW.creator_id) INTO v_has_mp;
      IF NOT COALESCE(v_has_mp, false) THEN
        RAISE EXCEPTION 'mercadopago_not_connected'
          USING HINT = 'Conecta tu cuenta de MercadoPago antes de publicar un producto con precio.';
      END IF;
    END IF;

    SELECT COALESCE(cp.plan, 'gratis') INTO v_plan
    FROM (SELECT 1) x
    LEFT JOIN public.creator_plans cp ON cp.creator_id = NEW.creator_id
      AND (cp.plan_vence IS NULL OR cp.plan_vence > now());
    v_plan := COALESCE(v_plan, 'gratis');

    v_limit := CASE v_plan
      WHEN 'gratis' THEN 2
      WHEN 'creador' THEN 10
      ELSE NULL
    END;

    IF v_limit IS NOT NULL THEN
      SELECT count(*) INTO v_count
      FROM public.courses
      WHERE creator_id = NEW.creator_id
        AND status = 'published'
        AND id <> NEW.id;
      IF v_count >= v_limit THEN
        RAISE EXCEPTION 'plan_limit_courses_%', v_plan
          USING HINT = 'Tu plan permite hasta ' || v_limit::text || ' cursos publicados. Mejora tu plan para publicar más.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Security fixes: hide ebooks.file_url and events.meeting_url from public reads
REVOKE SELECT (file_url) ON public.ebooks FROM authenticated, anon;
REVOKE SELECT (meeting_url) ON public.events FROM authenticated, anon;

GRANT SELECT (id, creator_id, title, slug, description, price_clp,
              cover_image_url, status, created_at, updated_at, category_id, is_novu_official)
  ON public.ebooks TO authenticated, anon;

GRANT SELECT (id, creator_id, title, slug, description, price_clp,
              cover_image_url, status, created_at, updated_at, category_id,
              event_type, event_date, duration_minutes, max_attendees, is_novu_official)
  ON public.events TO authenticated, anon;

GRANT SELECT (file_url) ON public.ebooks TO service_role;
GRANT SELECT (meeting_url) ON public.events TO service_role;
