-- Add product_type to courses table to differentiate product types
-- We'll use 'course' as default for existing records
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'course';

-- Create ebooks table
CREATE TABLE public.ebooks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  cover_image_url text,
  file_url text, -- URL to the downloadable PDF/EPUB
  price_clp integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  category_id uuid REFERENCES public.categories(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create events table
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  cover_image_url text,
  event_type text NOT NULL DEFAULT 'online', -- 'online' or 'presencial'
  meeting_url text, -- Zoom/Meet link for online events
  event_date timestamp with time zone NOT NULL,
  duration_minutes integer DEFAULT 60,
  max_attendees integer, -- null means unlimited
  price_clp integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  category_id uuid REFERENCES public.categories(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create event_registrations table for tracking attendees
CREATE TABLE public.event_registrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'registered', -- 'registered', 'cancelled', 'attended'
  registered_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- RLS policies for ebooks
CREATE POLICY "Published ebooks are viewable by everyone"
ON public.ebooks FOR SELECT
USING (status = 'published' OR creator_id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Creators can insert own ebooks"
ON public.ebooks FOR INSERT
WITH CHECK (creator_id = auth.uid() AND (get_user_role(auth.uid()) = 'creator' OR get_user_role(auth.uid()) = 'admin'));

CREATE POLICY "Creators can update own ebooks"
ON public.ebooks FOR UPDATE
USING (creator_id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Creators can delete own ebooks"
ON public.ebooks FOR DELETE
USING (creator_id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

-- RLS policies for events
CREATE POLICY "Published events are viewable by everyone"
ON public.events FOR SELECT
USING (status = 'published' OR creator_id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Creators can insert own events"
ON public.events FOR INSERT
WITH CHECK (creator_id = auth.uid() AND (get_user_role(auth.uid()) = 'creator' OR get_user_role(auth.uid()) = 'admin'));

CREATE POLICY "Creators can update own events"
ON public.events FOR UPDATE
USING (creator_id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Creators can delete own events"
ON public.events FOR DELETE
USING (creator_id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

-- RLS policies for event_registrations
CREATE POLICY "Users can view own registrations"
ON public.event_registrations FOR SELECT
USING (user_id = auth.uid() OR get_user_role(auth.uid()) = 'admin');

CREATE POLICY "Creators can view registrations for own events"
ON public.event_registrations FOR SELECT
USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_registrations.event_id AND e.creator_id = auth.uid()));

CREATE POLICY "Users can register for events"
ON public.event_registrations FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own registrations"
ON public.event_registrations FOR UPDATE
USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_ebooks_updated_at
BEFORE UPDATE ON public.ebooks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add unique constraint on slugs
ALTER TABLE public.ebooks ADD CONSTRAINT ebooks_slug_unique UNIQUE (slug);
ALTER TABLE public.events ADD CONSTRAINT events_slug_unique UNIQUE (slug);

-- Add unique constraint to prevent duplicate registrations
ALTER TABLE public.event_registrations ADD CONSTRAINT event_registrations_unique UNIQUE (event_id, user_id);