ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_product_order jsonb NOT NULL DEFAULT '["course", "event", "ebook", "session"]'::jsonb;

CREATE OR REPLACE FUNCTION public.enforce_one_free_session_per_creator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.price_clp, 0) = 0 AND NEW.status <> 'draft' THEN
    IF EXISTS (
      SELECT 1
      FROM public.one_on_one_sessions existing
      WHERE existing.creator_id = NEW.creator_id
        AND COALESCE(existing.price_clp, 0) = 0
        AND existing.status <> 'draft'
        AND existing.id IS DISTINCT FROM NEW.id
    ) THEN
      RAISE EXCEPTION 'Cada creador puede tener como máximo un servicio 1:1 gratuito activo';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_one_free_session_per_creator ON public.one_on_one_sessions;
CREATE TRIGGER enforce_one_free_session_per_creator
BEFORE INSERT OR UPDATE OF creator_id, price_clp, status
ON public.one_on_one_sessions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_one_free_session_per_creator();