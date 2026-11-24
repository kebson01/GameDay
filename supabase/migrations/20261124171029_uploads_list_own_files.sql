-- Storage needs a select policy for users to list/delete their own files
-- (public URLs keep working for everyone because the bucket is public)
create policy "uploads: users list own files" on storage.objects
  for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
