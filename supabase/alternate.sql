-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.
alter table hs_subscriptions add column if not exists alternate boolean not null default false;
notify pgrst, 'reload schema';
