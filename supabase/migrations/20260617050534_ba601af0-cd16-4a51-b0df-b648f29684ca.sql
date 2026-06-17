
-- 1. Courses + orders columns
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS community_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS community_fee_clp integer NOT NULL DEFAULT 990;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS community_fee_clp integer NOT NULL DEFAULT 0;

-- 2. Bans (created first so helper function can reference it)
CREATE TABLE IF NOT EXISTS public.course_community_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.course_community_bans TO authenticated;
GRANT ALL ON public.course_community_bans TO service_role;
ALTER TABLE public.course_community_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ccb_select_creator" ON public.course_community_bans FOR SELECT TO authenticated
USING (public.is_course_creator(auth.uid(), course_id));
CREATE POLICY "ccb_insert_creator" ON public.course_community_bans FOR INSERT TO authenticated
WITH CHECK (public.is_course_creator(auth.uid(), course_id) AND banned_by = auth.uid());
CREATE POLICY "ccb_delete_creator" ON public.course_community_bans FOR DELETE TO authenticated
USING (public.is_course_creator(auth.uid(), course_id));

-- 3. Helper: ban check
CREATE OR REPLACE FUNCTION public.is_course_banned(_user_id uuid, _course_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_community_bans
    WHERE course_id = _course_id AND user_id = _user_id
  );
$$;

-- 4. Posts
CREATE TABLE IF NOT EXISTS public.course_community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  image_url text,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ccp_course_created ON public.course_community_posts(course_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_community_posts TO authenticated;
GRANT ALL ON public.course_community_posts TO service_role;
ALTER TABLE public.course_community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ccp_select" ON public.course_community_posts FOR SELECT TO authenticated
USING (NOT public.is_course_banned(auth.uid(), course_id)
  AND (public.is_course_creator(auth.uid(), course_id) OR public.has_active_enrollment(auth.uid(), course_id)));
CREATE POLICY "ccp_insert" ON public.course_community_posts FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND NOT public.is_course_banned(auth.uid(), course_id)
  AND (public.is_course_creator(auth.uid(), course_id) OR public.has_active_enrollment(auth.uid(), course_id)));
CREATE POLICY "ccp_update_own_or_creator" ON public.course_community_posts FOR UPDATE TO authenticated
USING (author_id = auth.uid() OR public.is_course_creator(auth.uid(), course_id))
WITH CHECK (author_id = auth.uid() OR public.is_course_creator(auth.uid(), course_id));
CREATE POLICY "ccp_delete_own_or_creator" ON public.course_community_posts FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.is_course_creator(auth.uid(), course_id));

-- 5. Replies
CREATE TABLE IF NOT EXISTS public.course_community_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.course_community_posts(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ccr_post ON public.course_community_replies(post_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.course_community_replies TO authenticated;
GRANT ALL ON public.course_community_replies TO service_role;
ALTER TABLE public.course_community_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ccr_select" ON public.course_community_replies FOR SELECT TO authenticated
USING (NOT public.is_course_banned(auth.uid(), course_id)
  AND (public.is_course_creator(auth.uid(), course_id) OR public.has_active_enrollment(auth.uid(), course_id)));
CREATE POLICY "ccr_insert" ON public.course_community_replies FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND NOT public.is_course_banned(auth.uid(), course_id)
  AND (public.is_course_creator(auth.uid(), course_id) OR public.has_active_enrollment(auth.uid(), course_id)));
CREATE POLICY "ccr_delete_own_or_creator" ON public.course_community_replies FOR DELETE TO authenticated
USING (author_id = auth.uid() OR public.is_course_creator(auth.uid(), course_id));

-- 6. Reactions
CREATE TABLE IF NOT EXISTS public.course_community_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.course_community_posts(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.course_community_reactions TO authenticated;
GRANT ALL ON public.course_community_reactions TO service_role;
ALTER TABLE public.course_community_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ccrx_select" ON public.course_community_reactions FOR SELECT TO authenticated
USING (NOT public.is_course_banned(auth.uid(), course_id)
  AND (public.is_course_creator(auth.uid(), course_id) OR public.has_active_enrollment(auth.uid(), course_id)));
CREATE POLICY "ccrx_insert" ON public.course_community_reactions FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND NOT public.is_course_banned(auth.uid(), course_id)
  AND (public.is_course_creator(auth.uid(), course_id) OR public.has_active_enrollment(auth.uid(), course_id)));
CREATE POLICY "ccrx_delete_own" ON public.course_community_reactions FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 7. Ban trigger: deactivate enrollment
CREATE OR REPLACE FUNCTION public.handle_course_ban()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.enrollments SET status = 'banned'
  WHERE course_id = NEW.course_id AND user_id = NEW.user_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_course_ban ON public.course_community_bans;
CREATE TRIGGER trg_course_ban AFTER INSERT ON public.course_community_bans
FOR EACH ROW EXECUTE FUNCTION public.handle_course_ban();

CREATE OR REPLACE FUNCTION public.unban_user_from_course(_course_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_course_creator(auth.uid(), _course_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  DELETE FROM public.course_community_bans WHERE course_id = _course_id AND user_id = _user_id;
  UPDATE public.enrollments SET status = 'active'
    WHERE course_id = _course_id AND user_id = _user_id AND status = 'banned';
END; $$;

-- 8. Module resources
CREATE TABLE IF NOT EXISTS public.module_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  file_url text NOT NULL,
  file_size_bytes bigint,
  mime_type text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mr_module ON public.module_resources(module_id, order_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_resources TO authenticated;
GRANT ALL ON public.module_resources TO service_role;
ALTER TABLE public.module_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mr_select" ON public.module_resources FOR SELECT TO authenticated
USING (public.is_course_creator(auth.uid(), course_id) OR public.has_active_enrollment(auth.uid(), course_id));
CREATE POLICY "mr_creator_manage" ON public.module_resources FOR ALL TO authenticated
USING (public.is_course_creator(auth.uid(), course_id))
WITH CHECK (public.is_course_creator(auth.uid(), course_id));

-- 9. Feed RPCs
CREATE OR REPLACE FUNCTION public.get_course_community_feed(_course_id uuid)
RETURNS TABLE (
  id uuid, body text, image_url text, pinned boolean, created_at timestamptz,
  author_id uuid, author_name text, author_avatar text, is_creator boolean,
  reactions_count int, replies_count int, my_liked boolean
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH course_owner AS (SELECT creator_id FROM public.courses WHERE id = _course_id)
  SELECT p.id, p.body, p.image_url, p.pinned, p.created_at,
    p.author_id, pr.name, pr.avatar_url,
    (p.author_id = (SELECT creator_id FROM course_owner)),
    (SELECT count(*)::int FROM public.course_community_reactions r WHERE r.post_id = p.id),
    (SELECT count(*)::int FROM public.course_community_replies rp WHERE rp.post_id = p.id),
    EXISTS(SELECT 1 FROM public.course_community_reactions r WHERE r.post_id = p.id AND r.user_id = auth.uid())
  FROM public.course_community_posts p
  LEFT JOIN public.profiles pr ON pr.id = p.author_id
  WHERE p.course_id = _course_id
    AND NOT public.is_course_banned(auth.uid(), _course_id)
    AND (public.is_course_creator(auth.uid(), _course_id) OR public.has_active_enrollment(auth.uid(), _course_id))
  ORDER BY p.pinned DESC, p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_course_community_replies(_post_id uuid)
RETURNS TABLE (
  id uuid, body text, created_at timestamptz,
  author_id uuid, author_name text, author_avatar text, is_creator boolean
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.body, r.created_at, r.author_id, pr.name, pr.avatar_url,
    (r.author_id = (SELECT creator_id FROM public.courses WHERE id = r.course_id))
  FROM public.course_community_replies r
  LEFT JOIN public.profiles pr ON pr.id = r.author_id
  WHERE r.post_id = _post_id
    AND NOT public.is_course_banned(auth.uid(), r.course_id)
    AND (public.is_course_creator(auth.uid(), r.course_id) OR public.has_active_enrollment(auth.uid(), r.course_id))
  ORDER BY r.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_course_bans(_course_id uuid)
RETURNS TABLE (user_id uuid, name text, email text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_course_creator(auth.uid(), _course_id) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  RETURN QUERY
  SELECT b.user_id, p.name, u.email::text, b.created_at
  FROM public.course_community_bans b
  LEFT JOIN public.profiles p ON p.id = b.user_id
  LEFT JOIN auth.users u ON u.id = b.user_id
  WHERE b.course_id = _course_id
  ORDER BY b.created_at DESC;
END; $$;
