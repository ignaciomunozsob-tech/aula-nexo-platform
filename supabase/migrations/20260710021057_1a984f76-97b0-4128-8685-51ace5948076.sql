ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS redirect_url text;
ALTER TABLE public.ebooks ADD COLUMN IF NOT EXISTS redirect_url text;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS redirect_url text;
ALTER TABLE public.one_on_one_sessions ADD COLUMN IF NOT EXISTS redirect_url text;