
CREATE TYPE public.order_product_type AS ENUM ('course', 'ebook', 'event', 'community');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'failed', 'refunded');

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  product_type public.order_product_type NOT NULL,
  product_id uuid NOT NULL,
  amount_clp integer NOT NULL CHECK (amount_clp >= 0),
  creator_amount_clp integer NOT NULL DEFAULT 0,
  platform_amount_clp integer NOT NULL DEFAULT 0,
  status public.order_status NOT NULL DEFAULT 'pending',
  mp_preference_id text,
  mp_payment_id text,
  mp_payment_status text,
  metadata jsonb DEFAULT '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_user ON public.orders(user_id, created_at DESC);
CREATE INDEX idx_orders_creator ON public.orders(creator_id, created_at DESC);
CREATE INDEX idx_orders_product ON public.orders(product_type, product_id);
CREATE INDEX idx_orders_mp_preference ON public.orders(mp_preference_id);
CREATE INDEX idx_orders_mp_payment ON public.orders(mp_payment_id);

GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view their own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Creators can view orders for their products"
  ON public.orders FOR SELECT TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
