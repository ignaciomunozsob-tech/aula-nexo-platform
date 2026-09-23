GRANT SELECT (creator_id, google_email, calendar_id, connected_at)
ON public.creator_google_accounts TO authenticated;

GRANT SELECT (creator_id, nickname, email, live_mode)
ON public.creator_mercadopago_accounts TO authenticated;

CREATE POLICY "Owner can view safe google connection metadata"
ON public.creator_google_accounts
FOR SELECT TO authenticated
USING (auth.uid() = creator_id);

CREATE POLICY "Creator views safe MP connection metadata"
ON public.creator_mercadopago_accounts
FOR SELECT TO authenticated
USING (creator_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER FUNCTION public.get_my_google_connection() SECURITY INVOKER;
ALTER FUNCTION public.get_my_mercadopago_connection() SECURITY INVOKER;