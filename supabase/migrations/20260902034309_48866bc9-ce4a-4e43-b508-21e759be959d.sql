-- 1. Constraints
ALTER TABLE public.courses DROP CONSTRAINT IF EXISTS courses_status_check;
ALTER TABLE public.courses ADD CONSTRAINT courses_status_check CHECK (status = ANY (ARRAY['draft'::text,'published'::text,'hidden'::text]));

ALTER TABLE public.one_on_one_sessions DROP CONSTRAINT IF EXISTS one_on_one_sessions_status_check;
ALTER TABLE public.one_on_one_sessions ADD CONSTRAINT one_on_one_sessions_status_check CHECK (status = ANY (ARRAY['draft'::text,'published'::text,'hidden'::text,'archived'::text]));

-- 2. RLS: acceso público por enlace directo para published + hidden
DROP POLICY IF EXISTS "Published courses are viewable publicly" ON public.courses;
CREATE POLICY "Published courses are viewable publicly" ON public.courses
FOR SELECT USING (status IN ('published','hidden'));

DROP POLICY IF EXISTS "Published events are viewable publicly" ON public.events;
CREATE POLICY "Published events are viewable publicly" ON public.events
FOR SELECT USING (status IN ('published','hidden'));

DROP POLICY IF EXISTS "Published ebooks are viewable publicly" ON public.ebooks;
CREATE POLICY "Published ebooks are viewable publicly" ON public.ebooks
FOR SELECT USING (status IN ('published','hidden'));

DROP POLICY IF EXISTS "Published sessions are viewable publicly" ON public.one_on_one_sessions;
CREATE POLICY "Published sessions are viewable publicly" ON public.one_on_one_sessions
FOR SELECT USING (status IN ('published','hidden'));

DROP POLICY IF EXISTS "Modules viewable if course is published or user is creator/enro" ON public.course_modules;
CREATE POLICY "Modules viewable if course is published or user is creator/enro" ON public.course_modules
FOR SELECT USING (
  (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_modules.course_id AND (c.status IN ('published','hidden') OR c.creator_id = auth.uid())))
  OR public.get_user_role(auth.uid()) = 'admin'::public.app_role
);

-- 3. RPCs
CREATE OR REPLACE FUNCTION public.resolve_creator_product(_creator_slug text, _product_slug text)
 RETURNS TABLE(product_type text, product_id uuid, product_slug text, creator_id uuid)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH creator AS (
    SELECT id FROM public.profiles WHERE creator_slug = _creator_slug LIMIT 1
  )
  SELECT 'course'::text, c.id, c.slug, c.creator_id
    FROM public.courses c, creator
    WHERE c.creator_id = creator.id AND c.slug = _product_slug AND c.status IN ('published','hidden')
  UNION ALL
  SELECT 'event'::text, e.id, e.slug, e.creator_id
    FROM public.events e, creator
    WHERE e.creator_id = creator.id AND e.slug = _product_slug AND e.status IN ('published','hidden')
  UNION ALL
  SELECT 'ebook'::text, b.id, b.slug, b.creator_id
    FROM public.ebooks b, creator
    WHERE b.creator_id = creator.id AND b.slug = _product_slug AND b.status IN ('published','hidden')
  UNION ALL
  SELECT 'session'::text, s.id, s.slug, s.creator_id
    FROM public.one_on_one_sessions s, creator
    WHERE s.creator_id = creator.id AND s.slug = _product_slug AND s.status IN ('published','hidden')
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.get_public_session(_creator_slug text, _session_id uuid)
 RETURNS TABLE(id uuid, creator_id uuid, title text, description text, cover_url text, duration_min integer, price_clp integer, creator_name text, creator_avatar_url text, creator_slug text, timezone text, min_notice_hours integer, max_days_ahead integer, buffer_before_min integer, buffer_after_min integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT s.id, s.creator_id, s.title, s.description, s.cover_url,
         s.duration_min, s.price_clp,
         p.name, p.avatar_url, p.creator_slug,
         COALESCE(cs.timezone,'America/Santiago'),
         COALESCE(cs.min_notice_hours, 12),
         COALESCE(cs.max_days_ahead, 30),
         COALESCE(cs.buffer_before_min, 0),
         COALESCE(cs.buffer_after_min, 0)
  FROM public.one_on_one_sessions s
  JOIN public.profiles p ON p.id = s.creator_id
  LEFT JOIN public.creator_availability_settings cs ON cs.creator_id = s.creator_id
  WHERE s.id = _session_id
    AND s.status IN ('published','hidden')
    AND p.creator_slug = _creator_slug
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.get_course_groups_public(_course_id uuid)
 RETURNS TABLE(id uuid, name text, price_clp integer, is_default boolean, sales_code text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT g.id, g.name, g.price_clp, g.is_default, g.sales_code
  FROM public.course_groups g
  JOIN public.courses c ON c.id = g.course_id
  WHERE g.course_id = _course_id
    AND (c.status IN ('published','hidden') OR c.creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  ORDER BY g.is_default DESC, g.created_at ASC;
$function$;

-- 4. Triggers de MercadoPago: aplicar también a ocultos con precio
CREATE OR REPLACE FUNCTION public.enforce_paid_publish_requires_mp()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_has_mp boolean;
BEGIN
  IF NEW.status IN ('published','hidden')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
     AND COALESCE(NEW.price_clp, 0) > 0 THEN
    SELECT public.creator_has_mercadopago(NEW.creator_id) INTO v_has_mp;
    IF NOT COALESCE(v_has_mp, false) THEN
      RAISE EXCEPTION 'mercadopago_not_connected'
        USING HINT = 'Conecta tu cuenta de MercadoPago antes de publicar un producto con precio.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_course_publish_requires_mp()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_has_mp boolean;
BEGIN
  IF NEW.status IN ('published','hidden')
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status)
     AND COALESCE(NEW.price_clp, 0) > 0 THEN
    SELECT public.creator_has_mercadopago(NEW.creator_id) INTO v_has_mp;
    IF NOT COALESCE(v_has_mp, false) THEN
      RAISE EXCEPTION 'mercadopago_not_connected'
        USING HINT = 'Conecta tu cuenta de MercadoPago antes de publicar un producto con precio.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;