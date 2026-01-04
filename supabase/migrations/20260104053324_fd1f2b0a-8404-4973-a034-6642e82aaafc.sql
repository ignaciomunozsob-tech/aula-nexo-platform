-- Fix creator_reviews public exposure - require authentication to view reviews
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.creator_reviews;

-- Only authenticated users can view reviews (prevents anonymous scraping)
CREATE POLICY "Authenticated users can view reviews" 
ON public.creator_reviews 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Fix profiles exposure - remove overly permissive authenticated policy
DROP POLICY IF EXISTS "Authenticated users can view other profiles" ON public.profiles;