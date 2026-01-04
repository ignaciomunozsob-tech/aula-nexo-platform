-- Create table for 2FA codes for creators
CREATE TABLE public.creator_2fa_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_2fa_codes ENABLE ROW LEVEL SECURITY;

-- Users can only view their own codes (for verification)
CREATE POLICY "Users can view own 2FA codes"
ON public.creator_2fa_codes
FOR SELECT
USING (user_id = auth.uid());

-- Allow edge function to insert codes (using service role)
-- No INSERT policy needed for regular users - only service role inserts

-- Allow users to update their own codes (mark as used)
CREATE POLICY "Users can update own 2FA codes"
ON public.creator_2fa_codes
FOR UPDATE
USING (user_id = auth.uid());

-- Index for faster lookups
CREATE INDEX idx_creator_2fa_codes_user_id ON public.creator_2fa_codes(user_id);
CREATE INDEX idx_creator_2fa_codes_expires_at ON public.creator_2fa_codes(expires_at);