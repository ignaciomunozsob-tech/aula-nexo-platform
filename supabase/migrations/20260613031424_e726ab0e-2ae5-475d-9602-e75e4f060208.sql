
CREATE TABLE public.creator_billing_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Fiscal
  tax_id TEXT,
  legal_name TEXT,
  business_type TEXT CHECK (business_type IN ('persona_natural','empresa')),
  document_type TEXT CHECK (document_type IN ('boleta','factura')),
  address TEXT,
  city TEXT,
  region TEXT,
  billing_email TEXT,
  -- Banking
  bank_name TEXT,
  bank_account_type TEXT CHECK (bank_account_type IN ('corriente','vista','ahorro','rut')),
  bank_account_number TEXT,
  bank_account_holder TEXT,
  bank_account_holder_tax_id TEXT,
  -- Status
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.creator_billing_info TO authenticated;
GRANT ALL ON public.creator_billing_info TO service_role;

ALTER TABLE public.creator_billing_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creator can view own billing"
  ON public.creator_billing_info FOR SELECT
  TO authenticated
  USING (auth.uid() = creator_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Creator can insert own billing"
  ON public.creator_billing_info FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creator can update own billing"
  ON public.creator_billing_info FOR UPDATE
  TO authenticated
  USING (auth.uid() = creator_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = creator_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete billing"
  ON public.creator_billing_info FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_creator_billing_info_updated_at
  BEFORE UPDATE ON public.creator_billing_info
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_creator_billing_info_creator_id ON public.creator_billing_info(creator_id);
