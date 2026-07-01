DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own course assets" ON storage.objects;

CREATE POLICY "Users can read own course assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own uploads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'course-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);