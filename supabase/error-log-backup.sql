-- Error alerts and weekly backups. Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.

create table if not exists error_log (
  id uuid primary key default gen_random_uuid(),
  message text,
  stack text,
  page text,
  user_id uuid,
  created_at timestamptz not null default now()
);
alter table error_log enable row level security;
drop policy if exists "error log insert" on error_log;
create policy "error log insert" on error_log for insert to anon, authenticated with check (true);
drop policy if exists "error log staff read" on error_log;
create policy "error log staff read" on error_log for select to authenticated using (is_staff());

-- private bucket for the weekly backup files (only the server key can read or write it)
insert into storage.buckets (id, name, public) values ('backups', 'backups', false) on conflict (id) do nothing;

notify pgrst, 'reload schema';
