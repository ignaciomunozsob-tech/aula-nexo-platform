
-- Lookup helper used only by service_role from edge functions
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.find_user_id_by_email(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO service_role;

-- Guest email column on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_email text;
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON public.orders(guest_email);
