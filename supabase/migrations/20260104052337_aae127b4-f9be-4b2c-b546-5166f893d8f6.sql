-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create a more restrictive SELECT policy
-- 1. Users can always see their own profile (all fields)
-- 2. Anyone can see creator profiles (role='creator') - needed for public profile pages
-- 3. Authenticated users can see other user profiles (for features like reviews showing reviewer names)
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Creator profiles are publicly viewable" 
ON public.profiles 
FOR SELECT 
USING (role = 'creator');

CREATE POLICY "Authenticated users can view other profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.role() = 'authenticated');