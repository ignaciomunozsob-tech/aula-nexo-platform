CREATE OR REPLACE FUNCTION public.get_my_mercadopago_connection()
RETURNS TABLE(nickname text, email text, live_mode boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.nickname, a.email, a.live_mode
  FROM public.creator_mercadopago_accounts a
  WHERE a.creator_id = auth.uid()
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_my_mercadopago_connection() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_mercadopago_connection() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_my_mercadopago_connection() TO authenticated;

REVOKE SELECT ON public.creator_google_accounts FROM anon, authenticated;
REVOKE SELECT ON public.creator_mercadopago_accounts FROM anon, authenticated;

DROP POLICY IF EXISTS "Owner can view own google connection" ON public.creator_google_accounts;
DROP POLICY IF EXISTS "Creator views own MP connection" ON public.creator_mercadopago_accounts;