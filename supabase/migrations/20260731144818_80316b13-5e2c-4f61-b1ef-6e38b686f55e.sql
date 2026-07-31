ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recording_video_id text,
  ADD COLUMN IF NOT EXISTS recording_status text NOT NULL DEFAULT 'ready';

GRANT SELECT (recording_video_id, recording_status) ON public.events TO authenticated;
GRANT UPDATE (recording_video_id, recording_status) ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

DROP FUNCTION IF EXISTS public.get_my_event_details(uuid);
CREATE FUNCTION public.get_my_event_details(_event_id uuid)
 RETURNS TABLE(id uuid, title text, description text, cover_image_url text, event_type text, event_date timestamp with time zone, duration_minutes integer, location text, meeting_url text, redirect_url text, creator_id uuid, creator_name text, creator_slug text, recording_video_id text, recording_status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT e.id, e.title, e.description, e.cover_image_url,
         e.event_type, e.event_date, e.duration_minutes,
         e.location, e.meeting_url, e.redirect_url,
         e.creator_id, p.name, p.creator_slug,
         e.recording_video_id, e.recording_status
  FROM public.events e
  LEFT JOIN public.profiles p ON p.id = e.creator_id
  WHERE e.id = _event_id
    AND (
      e.creator_id = auth.uid()
      OR public.get_user_role(auth.uid()) = 'admin'::app_role
      OR EXISTS (
        SELECT 1 FROM public.event_registrations r
        WHERE r.event_id = e.id AND r.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.user_id = auth.uid()
          AND o.status = 'paid'
          AND (
            (o.product_type = 'event' AND o.product_id = e.id)
            OR (o.bump_product_type = 'event' AND o.bump_product_id = e.id)
          )
      )
    )
  LIMIT 1
$function$;

DROP POLICY IF EXISTS "Users can update own reviews" ON public.creator_reviews;
CREATE POLICY "Users can update own reviews"
ON public.creator_reviews
FOR UPDATE
TO authenticated
USING (reviewer_id = auth.uid())
WITH CHECK (reviewer_id = auth.uid());
