-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.
-- 1) Messages can only be deleted in the first 30 minutes after they were sent.
drop policy if exists "messages delete own" on messages;
create policy "messages delete own" on messages for delete to authenticated
  using (
    created_at > now() - interval '30 minutes'
    and ((sender = 'student' and student_id = auth.uid()) or (sender = 'tutor' and is_staff()))
  );

-- 2) Marks can be edited by the same people who can delete them.
drop policy if exists "marks student update" on marks;
create policy "marks student update" on marks for update to authenticated
  using (student_id = auth.uid() and source = 'school') with check (student_id = auth.uid() and source = 'school');
drop policy if exists "marks staff update" on marks;
create policy "marks staff update" on marks for update to authenticated
  using (is_staff() and source = 'tutor') with check (is_staff() and source = 'tutor');

notify pgrst, 'reload schema';
