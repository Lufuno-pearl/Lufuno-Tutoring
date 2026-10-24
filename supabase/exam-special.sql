-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.
-- Exam Special: study pack bundles, the student's scope, and uploaded scope/material files.

alter table pack_orders add column if not exists bundle_id uuid;
alter table pack_orders add column if not exists scope_text text;
alter table pack_orders add column if not exists reference text;

-- private bucket for the scope and material students send with a pack request
insert into storage.buckets (id, name, public) values ('pack-scope', 'pack-scope', false) on conflict (id) do nothing;

drop policy if exists "pack scope insert own" on storage.objects;
create policy "pack scope insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'pack-scope' and exists (
    select 1 from pack_orders o where o.id::text = (storage.foldername(name))[1] and o.student_id = auth.uid()));

drop policy if exists "pack scope read own or staff" on storage.objects;
create policy "pack scope read own or staff" on storage.objects for select to authenticated
  using (bucket_id = 'pack-scope' and (is_staff() or exists (
    select 1 from pack_orders o where o.id::text = (storage.foldername(name))[1] and o.student_id = auth.uid())));

drop policy if exists "pack scope delete staff" on storage.objects;
create policy "pack scope delete staff" on storage.objects for delete to authenticated
  using (bucket_id = 'pack-scope' and is_staff());

notify pgrst, 'reload schema';
