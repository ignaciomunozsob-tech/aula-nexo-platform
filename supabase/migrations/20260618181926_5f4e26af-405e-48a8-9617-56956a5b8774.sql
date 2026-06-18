-- Regenerate ugly draft-* slugs from product titles (per creator, unique suffix when collision)
DO $$
DECLARE
  r RECORD;
  base TEXT;
  candidate TEXT;
  i INT;
BEGIN
  FOR r IN SELECT id, creator_id, title FROM public.courses WHERE slug LIKE 'draft-%' OR slug LIKE 'novu-draft-%' LOOP
    base := public.slugify(COALESCE(NULLIF(trim(r.title), ''), 'curso'));
    candidate := base;
    i := 0;
    WHILE EXISTS (
      SELECT 1 FROM public.courses WHERE creator_id = r.creator_id AND slug = candidate AND id <> r.id
      UNION ALL SELECT 1 FROM public.events WHERE creator_id = r.creator_id AND slug = candidate
      UNION ALL SELECT 1 FROM public.ebooks WHERE creator_id = r.creator_id AND slug = candidate
      UNION ALL SELECT 1 FROM public.one_on_one_sessions WHERE creator_id = r.creator_id AND slug = candidate
    ) LOOP
      i := i + 1;
      candidate := base || '-' || i::text;
    END LOOP;
    UPDATE public.courses SET slug = candidate WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id, creator_id, title FROM public.events WHERE slug LIKE 'draft-%' OR slug LIKE 'novu-draft-%' LOOP
    base := public.slugify(COALESCE(NULLIF(trim(r.title), ''), 'evento'));
    candidate := base; i := 0;
    WHILE EXISTS (
      SELECT 1 FROM public.events WHERE creator_id = r.creator_id AND slug = candidate AND id <> r.id
      UNION ALL SELECT 1 FROM public.courses WHERE creator_id = r.creator_id AND slug = candidate
      UNION ALL SELECT 1 FROM public.ebooks WHERE creator_id = r.creator_id AND slug = candidate
      UNION ALL SELECT 1 FROM public.one_on_one_sessions WHERE creator_id = r.creator_id AND slug = candidate
    ) LOOP i := i + 1; candidate := base || '-' || i::text; END LOOP;
    UPDATE public.events SET slug = candidate WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id, creator_id, title FROM public.ebooks WHERE slug LIKE 'draft-%' OR slug LIKE 'novu-draft-%' LOOP
    base := public.slugify(COALESCE(NULLIF(trim(r.title), ''), 'ebook'));
    candidate := base; i := 0;
    WHILE EXISTS (
      SELECT 1 FROM public.ebooks WHERE creator_id = r.creator_id AND slug = candidate AND id <> r.id
      UNION ALL SELECT 1 FROM public.courses WHERE creator_id = r.creator_id AND slug = candidate
      UNION ALL SELECT 1 FROM public.events WHERE creator_id = r.creator_id AND slug = candidate
      UNION ALL SELECT 1 FROM public.one_on_one_sessions WHERE creator_id = r.creator_id AND slug = candidate
    ) LOOP i := i + 1; candidate := base || '-' || i::text; END LOOP;
    UPDATE public.ebooks SET slug = candidate WHERE id = r.id;
  END LOOP;

  FOR r IN SELECT id, creator_id, title FROM public.one_on_one_sessions WHERE slug LIKE 'draft-%' OR slug LIKE 'novu-draft-%' LOOP
    base := public.slugify(COALESCE(NULLIF(trim(r.title), ''), 'sesion'));
    candidate := base; i := 0;
    WHILE EXISTS (
      SELECT 1 FROM public.one_on_one_sessions WHERE creator_id = r.creator_id AND slug = candidate AND id <> r.id
      UNION ALL SELECT 1 FROM public.courses WHERE creator_id = r.creator_id AND slug = candidate
      UNION ALL SELECT 1 FROM public.events WHERE creator_id = r.creator_id AND slug = candidate
      UNION ALL SELECT 1 FROM public.ebooks WHERE creator_id = r.creator_id AND slug = candidate
    ) LOOP i := i + 1; candidate := base || '-' || i::text; END LOOP;
    UPDATE public.one_on_one_sessions SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;