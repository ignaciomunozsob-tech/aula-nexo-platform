
-- Owner-scoped policies (path layout: <user_id>/...)
CREATE POLICY "protected: owners can read own files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'protected-content'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "protected: creators can upload own files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'protected-content'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND (
    public.get_user_role(auth.uid()) = 'creator'
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "protected: owners can update own files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'protected-content'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "protected: owners can delete own files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'protected-content'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);
