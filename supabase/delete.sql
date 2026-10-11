-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.

-- Delete a message for everyone: students delete their own, tutors/owners delete their own.
drop policy if exists "messages delete own" on messages;
create policy "messages delete own" on messages for delete to authenticated
  using ((sender = 'student' and student_id = auth.uid()) or (sender = 'tutor' and is_staff()));

-- Delete uploaded files.
drop policy if exists "homework delete own or staff" on storage.objects;
create policy "homework delete own or staff" on storage.objects for delete to authenticated
  using (bucket_id = 'homework' and ((storage.foldername(name))[1] = auth.uid()::text or is_staff()));

drop policy if exists "materials delete own or staff" on storage.objects;
create policy "materials delete own or staff" on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and ((storage.foldername(name))[1] = auth.uid()::text or is_staff()));

drop policy if exists "study packs delete staff" on storage.objects;
create policy "study packs delete staff" on storage.objects for delete to authenticated
  using (bucket_id = 'study-packs' and is_staff());

notify pgrst, 'reload schema';
