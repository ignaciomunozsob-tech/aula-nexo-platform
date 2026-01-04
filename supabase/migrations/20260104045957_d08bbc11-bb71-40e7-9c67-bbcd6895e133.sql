-- Add interests column to profiles for storing user learning preferences
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';

-- Add onboarding_completed to track if user finished onboarding
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;