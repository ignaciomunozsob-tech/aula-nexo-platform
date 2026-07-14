DROP FUNCTION IF EXISTS public.get_my_google_connection();

CREATE OR REPLACE FUNCTION public.get_my_google_connection()
RETURNS TABLE(
  google_email text,
  calendar_id text,
  connected_at timestamptz,
  scope text,
  has_required_scopes boolean,
  missing_scopes text[]
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.google_email,
    c.calendar_id,
    c.connected_at,
    c.scope,
    NOT EXISTS (
      SELECT 1
      FROM unnest(ARRAY[
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.freebusy',
        'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
      ]::text[]) AS required_scope
      WHERE NOT (required_scope = ANY(string_to_array(coalesce(c.scope, ''), ' ')))
    ) AS has_required_scopes,
    ARRAY(
      SELECT required_scope
      FROM unnest(ARRAY[
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/calendar.freebusy',
        'https://www.googleapis.com/auth/calendar.calendarlist.readonly'
      ]::text[]) AS required_scope
      WHERE NOT (required_scope = ANY(string_to_array(coalesce(c.scope, ''), ' ')))
    ) AS missing_scopes
  FROM public.creator_google_accounts c
  WHERE c.creator_id = auth.uid()
$$;

GRANT EXECUTE ON FUNCTION public.get_my_google_connection() TO authenticated;