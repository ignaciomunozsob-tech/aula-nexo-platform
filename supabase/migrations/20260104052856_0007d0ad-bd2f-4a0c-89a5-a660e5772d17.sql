-- Complete storage policies fix with proper drop statements
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can only upload to own namespace" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Course assets are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload course assets" ON storage.objects;

-- Recreate with proper namespace enforcement
CREATE POLICY "Users can only upload to own namespace" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'course-assets' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own uploads" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'course-assets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own uploads" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'course-assets' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Course assets are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'course-assets');