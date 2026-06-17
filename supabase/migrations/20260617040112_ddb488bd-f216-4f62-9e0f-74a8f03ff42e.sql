CREATE TABLE public.creator_google_accounts (
  creator_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  google_sub TEXT NOT NULL,
  google_email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT,
  calendar_id TEXT NOT NULL DEFAULT 'primary',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, DELETE ON public.creator_google_accounts TO authenticated;
GRANT ALL ON public.creator_google_accounts TO service_role;

ALTER TABLE public.creator_google_accounts ENABLE ROW LEVEL SECURITY;

-- Owner can see their row (tokens are server-only via service_role; we'll expose a safe view via RPC for the UI)
CREATE POLICY "Owner can view own google connection"
ON public.creator_google_accounts
FOR SELECT
TO authenticated
USING (auth.uid() = creator_id);

CREATE POLICY "Owner can delete own google connection"
ON public.creator_google_accounts
FOR DELETE
TO authenticated
USING (auth.uid() = creator_id);

CREATE TRIGGER update_creator_google_accounts_updated_at
BEFORE UPDATE ON public.creator_google_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Safe RPC for the UI: returns only non-sensitive fields
CREATE OR REPLACE FUNCTION public.get_my_google_connection()
RETURNS TABLE(google_email text, calendar_id text, connected_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT google_email, calendar_id, connected_at
  FROM public.creator_google_accounts
  WHERE creator_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.get_my_google_connection() TO authenticated;