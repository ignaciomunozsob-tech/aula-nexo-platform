
-- 1. Reemplazar el trigger de publicación: ya no chequea plan, solo MercadoPago
DROP TRIGGER IF EXISTS enforce_course_publish_rules ON public.courses;
DROP FUNCTION IF EXISTS public.enforce_course_publish_rules() CASCADE;

CREATE OR REPLACE FUNCTION public.enforce_course_publish_requires_mp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_has_mp boolean;
BEGIN
  IF NEW.status = 'published'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'published')
     AND COALESCE(NEW.price_clp, 0) > 0 THEN
    SELECT public.creator_has_mercadopago(NEW.creator_id) INTO v_has_mp;
    IF NOT COALESCE(v_has_mp, false) THEN
      RAISE EXCEPTION 'mercadopago_not_connected'
        USING HINT = 'Conecta tu cuenta de MercadoPago antes de publicar un producto con precio.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_course_publish_requires_mp
BEFORE INSERT OR UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.enforce_course_publish_requires_mp();

-- 2. Eliminar tablas y funciones del sistema de planes
DROP FUNCTION IF EXISTS public.get_my_plan() CASCADE;
DROP TABLE IF EXISTS public.creator_plans CASCADE;
DROP TABLE IF EXISTS public.subscription_requests CASCADE;
DROP TABLE IF EXISTS public.waitlist_pro CASCADE;

-- 3. Configuración global de la plataforma
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read settings"
  ON public.app_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (key, value) VALUES
  ('commission_pct',    '10'::jsonb),
  ('community_fee_clp', '990'::jsonb),
  ('max_installments',  '3'::jsonb),
  ('support_whatsapp',  '"https://wa.me/56933728004"'::jsonb)
ON CONFLICT (key) DO NOTHING;
