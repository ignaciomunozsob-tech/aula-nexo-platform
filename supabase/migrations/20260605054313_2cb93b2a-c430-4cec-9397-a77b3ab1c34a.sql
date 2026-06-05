
-- =========================================
-- Enums
-- =========================================
CREATE TYPE public.community_access_mode AS ENUM ('invite', 'paid');
CREATE TYPE public.community_member_role AS ENUM ('owner', 'moderator', 'member');
CREATE TYPE public.community_join_status AS ENUM ('pending', 'approved', 'rejected');

-- =========================================
-- Helper: updated_at trigger fn already exists (public.update_updated_at_column)
-- =========================================

-- =========================================
-- communities
-- =========================================
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  cover_url text,
  access_mode public.community_access_mode NOT NULL DEFAULT 'invite',
  price_clp integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_communities_creator ON public.communities(creator_id);
CREATE INDEX idx_communities_published ON public.communities(is_published);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.communities TO authenticated;
GRANT SELECT ON public.communities TO anon;
GRANT ALL ON public.communities TO service_role;

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Communities are viewable by everyone when published"
  ON public.communities FOR SELECT
  USING (is_published = true OR creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Creators can insert their communities"
  ON public.communities FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid() AND (public.has_role(auth.uid(), 'creator') OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Owners can update their communities"
  ON public.communities FOR UPDATE TO authenticated
  USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owners can delete their communities"
  ON public.communities FOR DELETE TO authenticated
  USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_communities_updated_at
  BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- community_members
-- =========================================
CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.community_member_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);
CREATE INDEX idx_community_members_community ON public.community_members(community_id);
CREATE INDEX idx_community_members_user ON public.community_members(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_members TO authenticated;
GRANT ALL ON public.community_members TO service_role;

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- Security definer helper to avoid recursion
CREATE OR REPLACE FUNCTION public.is_community_member(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = _community_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_community_owner(_user_id uuid, _community_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.communities
    WHERE id = _community_id AND creator_id = _user_id
  )
$$;

CREATE POLICY "Members and owner can view members"
  ON public.community_members FOR SELECT TO authenticated
  USING (
    public.is_community_owner(auth.uid(), community_id)
    OR user_id = auth.uid()
    OR public.is_community_member(auth.uid(), community_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owner can add members"
  ON public.community_members FOR INSERT TO authenticated
  WITH CHECK (public.is_community_owner(auth.uid(), community_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner can update members"
  ON public.community_members FOR UPDATE TO authenticated
  USING (public.is_community_owner(auth.uid(), community_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Owner or self can remove member"
  ON public.community_members FOR DELETE TO authenticated
  USING (
    public.is_community_owner(auth.uid(), community_id)
    OR user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- =========================================
-- community_join_requests
-- =========================================
CREATE TABLE public.community_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  status public.community_join_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);
CREATE INDEX idx_join_requests_community ON public.community_join_requests(community_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_join_requests TO authenticated;
GRANT ALL ON public.community_join_requests TO service_role;

ALTER TABLE public.community_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can view own request or owner can view all"
  ON public.community_join_requests FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_community_owner(auth.uid(), community_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Authenticated can create own request"
  ON public.community_join_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can update requests"
  ON public.community_join_requests FOR UPDATE TO authenticated
  USING (public.is_community_owner(auth.uid(), community_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "User or owner can delete request"
  ON public.community_join_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_community_owner(auth.uid(), community_id));

CREATE TRIGGER trg_join_requests_updated_at
  BEFORE UPDATE ON public.community_join_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- community_posts
-- =========================================
CREATE TABLE public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  category text,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_community ON public.community_posts(community_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view posts"
  ON public.community_posts FOR SELECT TO authenticated
  USING (
    public.is_community_member(auth.uid(), community_id)
    OR public.is_community_owner(auth.uid(), community_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Members can create posts"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.is_community_member(auth.uid(), community_id)
      OR public.is_community_owner(auth.uid(), community_id)
    )
  );

CREATE POLICY "Author or owner can update posts"
  ON public.community_posts FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_community_owner(auth.uid(), community_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Author or owner can delete posts"
  ON public.community_posts FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_community_owner(auth.uid(), community_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- community_post_comments
-- =========================================
CREATE TABLE public.community_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_post ON public.community_post_comments(post_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_post_comments TO authenticated;
GRANT ALL ON public.community_post_comments TO service_role;

ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view comments"
  ON public.community_post_comments FOR SELECT TO authenticated
  USING (
    public.is_community_member(auth.uid(), community_id)
    OR public.is_community_owner(auth.uid(), community_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Members can create comments"
  ON public.community_post_comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      public.is_community_member(auth.uid(), community_id)
      OR public.is_community_owner(auth.uid(), community_id)
    )
  );

CREATE POLICY "Author or owner can delete comments"
  ON public.community_post_comments FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_community_owner(auth.uid(), community_id) OR public.has_role(auth.uid(), 'admin'));

-- =========================================
-- community_post_likes
-- =========================================
CREATE TABLE public.community_post_likes (
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE INDEX idx_likes_post ON public.community_post_likes(post_id);

GRANT SELECT, INSERT, DELETE ON public.community_post_likes TO authenticated;
GRANT ALL ON public.community_post_likes TO service_role;

ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view likes"
  ON public.community_post_likes FOR SELECT TO authenticated
  USING (
    public.is_community_member(auth.uid(), community_id)
    OR public.is_community_owner(auth.uid(), community_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Members can like"
  ON public.community_post_likes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      public.is_community_member(auth.uid(), community_id)
      OR public.is_community_owner(auth.uid(), community_id)
    )
  );

CREATE POLICY "User can unlike own"
  ON public.community_post_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());
