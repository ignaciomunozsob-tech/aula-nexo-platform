ALTER TABLE public.session_bookings
  ADD COLUMN IF NOT EXISTS guest_phone TEXT,
  ADD COLUMN IF NOT EXISTS google_html_link TEXT;

DROP FUNCTION IF EXISTS public.get_creator_session_bookings();

CREATE OR REPLACE FUNCTION public.get_creator_session_bookings()
 RETURNS TABLE(id uuid, session_id uuid, session_title text, user_id uuid, attendee_name text, attendee_email text, attendee_phone text, start_at timestamp with time zone, end_at timestamp with time zone, status text, meet_url text, google_html_link text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT b.id, b.session_id, s.title,
         b.user_id,
         COALESCE(p.name, b.guest_name),
         COALESCE(u.email::text, b.guest_email),
         b.guest_phone,
         b.start_at, b.end_at, b.status, b.meet_url, b.google_html_link
  FROM public.session_bookings b
  JOIN public.one_on_one_sessions s ON s.id = b.session_id
  LEFT JOIN public.profiles p ON p.id = b.user_id
  LEFT JOIN auth.users u ON u.id = b.user_id
  WHERE b.creator_id = auth.uid()
  ORDER BY b.start_at DESC
$function$;