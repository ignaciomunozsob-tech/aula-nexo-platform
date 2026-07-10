ALTER TABLE public.events ADD COLUMN IF NOT EXISTS location text;
GRANT SELECT (location) ON public.events TO anon, authenticated;
GRANT UPDATE (location), INSERT (location) ON public.events TO authenticated;