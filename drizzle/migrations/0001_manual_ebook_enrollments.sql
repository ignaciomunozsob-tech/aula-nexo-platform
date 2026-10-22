CREATE TABLE public.ebook_enrollments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 ebook_id uuid NOT NULL REFERENCES public.ebooks(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
 source text NOT NULL DEFAULT 'manual' CHECK (source = 'manual'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (ebook_id,user_id)
);
GRANT SELECT ON public.ebook_enrollments TO authenticated;
GRANT ALL ON public.ebook_enrollments TO service_role;
ALTER TABLE public.ebook_enrollments ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.has_manual_ebook_access(_ebook_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS(SELECT 1 FROM public.ebook_enrollments WHERE ebook_id=_ebook_id AND user_id=auth.uid() AND status='active') $$;
REVOKE ALL ON FUNCTION public.has_manual_ebook_access(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_manual_ebook_access(uuid) TO authenticated,service_role;
CREATE POLICY "Students and owners read ebook access" ON public.ebook_enrollments FOR SELECT TO authenticated USING (user_id=auth.uid() OR EXISTS (SELECT 1 FROM public.ebooks e WHERE e.id=ebook_id AND e.creator_id=auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Manual readers view ebooks" ON public.ebooks FOR SELECT TO authenticated USING (public.has_manual_ebook_access(id));
CREATE OR REPLACE FUNCTION public.get_ebook_students(_ebook_id uuid)
RETURNS TABLE(order_id uuid,user_id uuid,name text,email text,phone text,amount_clp integer,is_bump boolean,purchased_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT o.id,o.user_id,COALESCE(p.name,o.guest_name),COALESCE(au.email,o.guest_email),o.guest_phone,
 CASE WHEN o.bump_product_id=_ebook_id THEN COALESCE(o.bump_amount_clp,0) ELSE GREATEST(o.amount_clp-CASE WHEN o.bump_product_id IS NOT NULL THEN COALESCE(o.bump_amount_clp,0) ELSE 0 END,0) END,
 COALESCE(o.bump_product_id=_ebook_id,false),COALESCE(o.paid_at,o.created_at)
 FROM public.orders o LEFT JOIN public.profiles p ON p.id=o.user_id LEFT JOIN auth.users au ON au.id=o.user_id
 WHERE o.status='paid' AND ((o.product_id=_ebook_id AND o.product_type='ebook') OR (o.bump_product_id=_ebook_id AND o.bump_product_type='ebook'))
 AND EXISTS(SELECT 1 FROM public.ebooks e WHERE e.id=_ebook_id AND e.creator_id=auth.uid())
 UNION ALL
 SELECT ee.id,ee.user_id,p.name,au.email,NULL::text,0,false,ee.created_at
 FROM public.ebook_enrollments ee LEFT JOIN public.profiles p ON p.id=ee.user_id LEFT JOIN auth.users au ON au.id=ee.user_id
 WHERE ee.ebook_id=_ebook_id AND ee.status='active'
 AND EXISTS(SELECT 1 FROM public.ebooks e WHERE e.id=_ebook_id AND e.creator_id=auth.uid())
 AND NOT EXISTS(SELECT 1 FROM public.orders o WHERE o.user_id=ee.user_id AND o.status='paid' AND ((o.product_type='ebook' AND o.product_id=_ebook_id) OR (o.bump_product_type='ebook' AND o.bump_product_id=_ebook_id)))
 ORDER BY 8 DESC
$$;
REVOKE ALL ON FUNCTION public.get_ebook_students(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_ebook_students(uuid) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.get_ebook_file_url(_ebook_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT e.file_url FROM public.ebooks e WHERE e.id=_ebook_id AND (
 e.creator_id=auth.uid() OR public.has_role(auth.uid(),'admin')
 OR public.has_manual_ebook_access(e.id)
 OR EXISTS(SELECT 1 FROM public.orders o WHERE o.user_id=auth.uid() AND o.status='paid' AND ((o.product_type='ebook' AND o.product_id=e.id) OR (o.bump_product_type='ebook' AND o.bump_product_id=e.id))))
$$;
REVOKE ALL ON FUNCTION public.get_ebook_file_url(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_ebook_file_url(uuid) TO authenticated,service_role;