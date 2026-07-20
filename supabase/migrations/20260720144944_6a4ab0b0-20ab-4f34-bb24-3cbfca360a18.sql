CREATE OR REPLACE FUNCTION public.get_product_checkout_page(_product_type text, _product_id uuid)
RETURNS TABLE(creator_slug text, page_slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.creator_slug, cp.slug
  FROM public.checkout_pages cp
  JOIN public.profiles p ON p.id = cp.creator_id
  WHERE cp.product_type = _product_type
    AND cp.product_id = _product_id
    AND cp.is_published = true
    AND p.creator_slug IS NOT NULL
  ORDER BY cp.created_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_product_checkout_page(text, uuid) TO anon, authenticated;