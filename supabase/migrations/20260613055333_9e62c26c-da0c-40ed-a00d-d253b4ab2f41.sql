CREATE OR REPLACE FUNCTION public.enforce_paid_publish_requires_mp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS enforce_paid_publish_mp_trg ON public.ebooks;
CREATE TRIGGER enforce_paid_publish_mp_trg
BEFORE INSERT OR UPDATE ON public.ebooks
FOR EACH ROW EXECUTE FUNCTION public.enforce_paid_publish_requires_mp();

DROP TRIGGER IF EXISTS enforce_paid_publish_mp_trg ON public.events;
CREATE TRIGGER enforce_paid_publish_mp_trg
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.enforce_paid_publish_requires_mp();

-- Communities use a different column name for status; check first.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'communities' AND column_name = 'status'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS enforce_paid_publish_mp_trg ON public.communities';
    EXECUTE 'CREATE TRIGGER enforce_paid_publish_mp_trg
             BEFORE INSERT OR UPDATE ON public.communities
             FOR EACH ROW EXECUTE FUNCTION public.enforce_paid_publish_requires_mp()';
  END IF;
END$$;