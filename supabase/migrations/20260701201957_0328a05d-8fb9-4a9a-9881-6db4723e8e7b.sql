
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS prevent_profile_role_self_change_trg ON public.profiles;
DROP TRIGGER IF EXISTS prevent_profile_role_self_change ON public.profiles;
DROP FUNCTION IF EXISTS public.prevent_profile_role_self_change() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _safe_role public.app_role;
BEGIN
  _safe_role := CASE NEW.raw_user_meta_data ->> 'role'
    WHEN 'creator' THEN 'creator'::public.app_role
    ELSE 'student'::public.app_role
  END;

  INSERT INTO public.profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email)
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _safe_role);

  RETURN NEW;
END;
$function$;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;

REVOKE SELECT (access_token, refresh_token)
  ON public.creator_mercadopago_accounts FROM anon, authenticated;

REVOKE SELECT (access_token, refresh_token)
  ON public.creator_google_accounts FROM anon, authenticated;

REVOKE SELECT (guest_email) ON public.orders FROM anon, authenticated;

DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'update_updated_at_column()',
    'enforce_paid_publish_requires_mp()',
    'enforce_unique_creator_slug()',
    'enforce_reserved_creator_slug()',
    'enforce_course_publish_requires_mp()',
    'handle_new_user()',
    'handle_course_ban()',
    'email_queue_wake()',
    'email_queue_dispatch()',
    'delete_email(text, bigint)',
    'enqueue_email(text, jsonb)',
    'read_email_batch(text, integer, integer)',
    'move_to_dlq(text, text, bigint, jsonb)',
    'find_user_id_by_email(text)'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END LOOP;
END $$;
