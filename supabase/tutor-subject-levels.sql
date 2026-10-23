-- Lets a tutor add and remove their own university subjects. Run once in Supabase: SQL Editor > New query > paste > Run
drop policy if exists "tutor adds own modules" on tutor_modules;
create policy "tutor adds own modules" on tutor_modules for insert to authenticated
  with check (tutor_id = auth.uid() and is_tutor());
drop policy if exists "tutor removes own modules" on tutor_modules;
create policy "tutor removes own modules" on tutor_modules for delete to authenticated
  using (tutor_id = auth.uid());
notify pgrst, 'reload schema';
