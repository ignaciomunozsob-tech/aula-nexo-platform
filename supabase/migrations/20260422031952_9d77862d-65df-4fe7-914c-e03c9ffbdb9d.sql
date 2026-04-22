-- Promote ignacio@raffamarketing.cl to admin role
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'ignacio@raffamarketing.cl' LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User ignacio@raffamarketing.cl not found. Please sign up first.';
  ELSE
    UPDATE public.profiles SET role = 'admin' WHERE id = v_user_id;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT DO NOTHING;

    -- Remove other roles for this user to avoid ambiguity
    DELETE FROM public.user_roles WHERE user_id = v_user_id AND role <> 'admin';
  END IF;
END $$;