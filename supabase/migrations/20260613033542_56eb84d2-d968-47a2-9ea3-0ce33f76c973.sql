
CREATE TABLE public.creator_mercadopago_accounts (
  creator_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mp_user_id text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  public_key text,
  live_mode boolean NOT NULL DEFAULT true,
  scope text,
  nickname text,
  email text,
  expires_at timestamptz,
  connected_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_mercadopago_accounts TO authenticated;
GRANT ALL ON public.creator_mercadopago_accounts TO service_role;

ALTER TABLE public.creator_mercadopago_accounts ENABLE ROW LEVEL SECURITY;

-- Creator can see/manage only their own connection. Admins can see all.
CREATE POLICY "Creator views own MP connection"
  ON public.creator_mercadopago_accounts FOR SELECT
  TO authenticated
  USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Creator disconnects own MP connection"
  ON public.creator_mercadopago_accounts FOR DELETE
  TO authenticated
  USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Inserts/updates of tokens go through edge functions (service_role) only.
-- No INSERT/UPDATE policy for authenticated on purpose.

CREATE TRIGGER mp_accounts_updated_at
  BEFORE UPDATE ON public.creator_mercadopago_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: check if a creator has MP connected (used by client UI without exposing tokens)
CREATE OR REPLACE FUNCTION public.creator_has_mercadopago(_creator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.creator_mercadopago_accounts WHERE creator_id = _creator_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.creator_has_mercadopago(uuid) TO anon, authenticated;
