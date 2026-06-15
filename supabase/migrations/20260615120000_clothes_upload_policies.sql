-- Allow signed-in users to upload wardrobe images to Clothes/{user_id}/...
-- Run in Supabase SQL Editor if uploads fail with a permissions error.

drop policy if exists "Users read own clothes" on storage.objects;
create policy "Users read own clothes"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'Clothes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users upload own clothes" on storage.objects;
create policy "Users upload own clothes"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'Clothes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own clothes" on storage.objects;
create policy "Users update own clothes"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'Clothes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own clothes" on storage.objects;
create policy "Users delete own clothes"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'Clothes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
