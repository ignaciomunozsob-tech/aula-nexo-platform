
DO $$
DECLARE tbl record;
BEGIN
  FOR tbl IN
    SELECT c.relname AS table_name
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'r' AND n.nspname = 'public'
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.table_name);
  END LOOP;
END $$;

GRANT SELECT ON public.courses                        TO anon;
GRANT SELECT ON public.course_modules                 TO anon;
GRANT SELECT ON public.events                         TO anon;
GRANT SELECT ON public.ebooks                         TO anon;
GRANT SELECT ON public.one_on_one_sessions            TO anon;
GRANT SELECT ON public.categories                     TO anon;
GRANT SELECT ON public.communities                    TO anon;
GRANT SELECT ON public.creator_availability_rules     TO anon;
GRANT SELECT ON public.creator_availability_settings  TO anon;
GRANT SELECT ON public.session_availability_rules     TO anon;
GRANT SELECT ON public.profiles                       TO anon;

REVOKE SELECT (file_url)    ON public.ebooks FROM PUBLIC;
REVOKE SELECT (file_url)    ON public.ebooks FROM anon;
REVOKE SELECT (file_url)    ON public.ebooks FROM authenticated;
REVOKE SELECT (meeting_url) ON public.events FROM PUBLIC;
REVOKE SELECT (meeting_url) ON public.events FROM anon;
REVOKE SELECT (meeting_url) ON public.events FROM authenticated;

GRANT SELECT (file_url)    ON public.ebooks TO authenticated;
GRANT SELECT (meeting_url) ON public.events TO authenticated;
