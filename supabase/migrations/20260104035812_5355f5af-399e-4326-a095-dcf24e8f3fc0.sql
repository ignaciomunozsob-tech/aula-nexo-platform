-- Add intro video URL to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS intro_video_url TEXT;

-- Create creator reviews table
CREATE TABLE public.creator_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(creator_id, reviewer_id) -- One review per user per creator
);

-- Enable RLS
ALTER TABLE public.creator_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews
CREATE POLICY "Reviews are viewable by everyone"
ON public.creator_reviews
FOR SELECT
USING (true);

-- Users can insert their own reviews
CREATE POLICY "Users can create reviews"
ON public.creator_reviews
FOR INSERT
WITH CHECK (auth.uid() = reviewer_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
ON public.creator_reviews
FOR UPDATE
USING (auth.uid() = reviewer_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
ON public.creator_reviews
FOR DELETE
USING (auth.uid() = reviewer_id);

-- Creators can view reviews for their profile
CREATE POLICY "Creators can view reviews for own profile"
ON public.creator_reviews
FOR SELECT
USING (creator_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_creator_reviews_updated_at
BEFORE UPDATE ON public.creator_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();