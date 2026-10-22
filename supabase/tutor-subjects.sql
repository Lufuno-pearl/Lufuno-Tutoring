-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.
alter table profiles add column if not exists teaches text[] default '{}';
notify pgrst, 'reload schema';
