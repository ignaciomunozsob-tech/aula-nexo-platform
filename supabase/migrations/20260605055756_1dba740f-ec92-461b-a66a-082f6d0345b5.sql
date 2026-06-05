
CREATE OR REPLACE FUNCTION public.get_ebook_file_url(_ebook_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.file_url
  FROM public.ebooks e
  WHERE e.id = _ebook_id
    AND (
      e.creator_id = auth.uid()
      OR public.get_user_role(auth.uid()) = 'admin'::app_role
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.user_id = auth.uid()
          AND o.product_type = 'ebook'
          AND o.product_id = e.id
          AND o.status = 'paid'
      )
    )
$$;
