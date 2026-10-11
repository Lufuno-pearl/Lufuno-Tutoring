-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.
alter table profiles add column if not exists school text;
alter table profiles add column if not exists province text;
notify pgrst, 'reload schema';
