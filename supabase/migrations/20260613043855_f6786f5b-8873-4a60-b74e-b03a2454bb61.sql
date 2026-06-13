ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_2fa_verified_at timestamptz;

REVOKE UPDATE (last_2fa_verified_at) ON public.profiles FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_creator_2fa_valid()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND last_2fa_verified_at IS NOT NULL
      AND last_2fa_verified_at > now() - interval '12 hours'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.is_creator_2fa_valid() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_creator_2fa_valid() TO authenticated;