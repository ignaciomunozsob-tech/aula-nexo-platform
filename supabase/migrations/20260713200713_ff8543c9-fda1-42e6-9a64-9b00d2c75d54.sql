
-- Prevent anon/authenticated from selecting the `file_url` column directly on ebooks.
-- The public SELECT policy stays; only this sensitive column is column-level revoked.
-- Purchasers/creator/admin obtain it via public.get_ebook_file_url() (security definer).
REVOKE SELECT (file_url) ON public.ebooks FROM anon, authenticated;

-- Ensure creators/admins can still write to the column (INSERT/UPDATE unchanged).
GRANT INSERT (file_url), UPDATE (file_url) ON public.ebooks TO authenticated;
GRANT ALL ON public.ebooks TO service_role;
