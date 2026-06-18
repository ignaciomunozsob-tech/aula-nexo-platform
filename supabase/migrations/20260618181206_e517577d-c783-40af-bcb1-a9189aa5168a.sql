
-- 1. Slugify helper
CREATE OR REPLACE FUNCTION public.slugify(_text text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(translate(coalesce(_text, ''),
      'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
      'aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc'
    )),
    '[^a-z0-9]+', '-', 'g'
  ))
$$;

-- 2. Add slug to sessions and backfill
ALTER TABLE public.one_on_one_sessions ADD COLUMN IF NOT EXISTS slug text;

DO $$
DECLARE
  rec RECORD;
  candidate text;
  base text;
  counter int;
BEGIN
  FOR rec IN SELECT id, creator_id, title FROM public.one_on_one_sessions WHERE slug IS NULL OR slug = '' LOOP
    base := COALESCE(NULLIF(public.slugify(rec.title), ''), 'sesion');
    candidate := base;
    counter := 1;
    WHILE EXISTS (
      SELECT 1 FROM public.courses WHERE creator_id = rec.creator_id AND slug = candidate
      UNION ALL SELECT 1 FROM public.events WHERE creator_id = rec.creator_id AND slug = candidate
      UNION ALL SELECT 1 FROM public.ebooks WHERE creator_id = rec.creator_id AND slug = candidate
      UNION ALL SELECT 1 FROM public.one_on_one_sessions WHERE creator_id = rec.creator_id AND slug = candidate AND id <> rec.id
    ) LOOP
      counter := counter + 1;
      candidate := base || '-' || counter;
    END LOOP;
    UPDATE public.one_on_one_sessions SET slug = candidate WHERE id = rec.id;
  END LOOP;
END $$;

ALTER TABLE public.one_on_one_sessions ALTER COLUMN slug SET NOT NULL;

-- 3. Unique-slug-per-creator trigger across all 4 product tables
CREATE OR REPLACE FUNCTION public.enforce_unique_creator_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE conflict_exists boolean;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    RAISE EXCEPTION 'slug_required' USING HINT = 'El identificador (slug) del producto no puede estar vacío.';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.courses
      WHERE creator_id = NEW.creator_id AND slug = NEW.slug AND (TG_TABLE_NAME <> 'courses' OR id <> NEW.id)
    UNION ALL
    SELECT 1 FROM public.events
      WHERE creator_id = NEW.creator_id AND slug = NEW.slug AND (TG_TABLE_NAME <> 'events' OR id <> NEW.id)
    UNION ALL
    SELECT 1 FROM public.ebooks
      WHERE creator_id = NEW.creator_id AND slug = NEW.slug AND (TG_TABLE_NAME <> 'ebooks' OR id <> NEW.id)
    UNION ALL
    SELECT 1 FROM public.one_on_one_sessions
      WHERE creator_id = NEW.creator_id AND slug = NEW.slug AND (TG_TABLE_NAME <> 'one_on_one_sessions' OR id <> NEW.id)
  ) INTO conflict_exists;

  IF conflict_exists THEN
    RAISE EXCEPTION 'unique_slug_per_creator'
      USING HINT = 'Ya tienes otro producto con esta misma URL. Cambia el título o el identificador.';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_unique_slug_courses ON public.courses;
CREATE TRIGGER trg_unique_slug_courses BEFORE INSERT OR UPDATE OF slug, creator_id ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_unique_creator_slug();

DROP TRIGGER IF EXISTS trg_unique_slug_events ON public.events;
CREATE TRIGGER trg_unique_slug_events BEFORE INSERT OR UPDATE OF slug, creator_id ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_unique_creator_slug();

DROP TRIGGER IF EXISTS trg_unique_slug_ebooks ON public.ebooks;
CREATE TRIGGER trg_unique_slug_ebooks BEFORE INSERT OR UPDATE OF slug, creator_id ON public.ebooks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_unique_creator_slug();

DROP TRIGGER IF EXISTS trg_unique_slug_sessions ON public.one_on_one_sessions;
CREATE TRIGGER trg_unique_slug_sessions BEFORE INSERT OR UPDATE OF slug, creator_id ON public.one_on_one_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_unique_creator_slug();

-- 4. Reserved creator_slug guard
CREATE OR REPLACE FUNCTION public.enforce_reserved_creator_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE reserved text[] := ARRAY[
  'app','creator-app','admin','login','signup','forgot-password','reset-password',
  'verify-2fa','courses','course','creator','precios','comisiones','terminos',
  'privacidad','trust','unsubscribe','payment','booking','p','embed','c',
  'preview','debug','api','assets','static','public','auth','settings'
];
BEGIN
  IF NEW.creator_slug IS NOT NULL AND NEW.creator_slug = ANY(reserved) THEN
    RAISE EXCEPTION 'reserved_creator_slug'
      USING HINT = 'Esa URL está reservada por el sistema. Elige otra.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_reserved_creator_slug ON public.profiles;
CREATE TRIGGER trg_reserved_creator_slug BEFORE INSERT OR UPDATE OF creator_slug ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_reserved_creator_slug();

-- 5. Public resolver RPC
CREATE OR REPLACE FUNCTION public.resolve_creator_product(_creator_slug text, _product_slug text)
RETURNS TABLE(product_type text, product_id uuid, product_slug text, creator_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH creator AS (
    SELECT id FROM public.profiles WHERE creator_slug = _creator_slug LIMIT 1
  )
  SELECT 'course'::text, c.id, c.slug, c.creator_id
    FROM public.courses c, creator
    WHERE c.creator_id = creator.id AND c.slug = _product_slug AND c.status = 'published'
  UNION ALL
  SELECT 'event'::text, e.id, e.slug, e.creator_id
    FROM public.events e, creator
    WHERE e.creator_id = creator.id AND e.slug = _product_slug AND e.status = 'published'
  UNION ALL
  SELECT 'ebook'::text, b.id, b.slug, b.creator_id
    FROM public.ebooks b, creator
    WHERE b.creator_id = creator.id AND b.slug = _product_slug AND b.status = 'published'
  UNION ALL
  SELECT 'session'::text, s.id, s.slug, s.creator_id
    FROM public.one_on_one_sessions s, creator
    WHERE s.creator_id = creator.id AND s.slug = _product_slug AND s.status = 'published'
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.resolve_creator_product(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.slugify(text) TO anon, authenticated;
