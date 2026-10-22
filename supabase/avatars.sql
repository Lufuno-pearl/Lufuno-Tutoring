-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.
-- Profile pictures: a private storage bucket, each person can only change their own, staff can view.
alter table profiles add column if not exists avatar_path text;

insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false) on conflict (id) do nothing;

drop policy if exists "avatars read own or staff" on storage.objects;
create policy "avatars read own or staff" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or is_staff()));
drop policy if exists "avatars insert own" on storage.objects;
create policy "avatars insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars delete own" on storage.objects;
create policy "avatars delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
