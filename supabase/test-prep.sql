-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.

create table if not exists test_prep (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  subject text not null,
  kind text not null default 'test' check (kind in ('test','exam')),
  test_date date not null,
  topics text not null,
  notes text,
  status text not null default 'upcoming' check (status in ('upcoming','done')),
  created_at timestamptz not null default now()
);
create index if not exists test_prep_student on test_prep (student_id);
create index if not exists test_prep_date on test_prep (test_date);
alter table test_prep enable row level security;

drop policy if exists "test_prep student add" on test_prep;
create policy "test_prep student add" on test_prep for insert to authenticated with check (student_id = auth.uid());
drop policy if exists "test_prep read" on test_prep;
create policy "test_prep read" on test_prep for select to authenticated using (student_id = auth.uid() or is_staff());
drop policy if exists "test_prep student update" on test_prep;
create policy "test_prep student update" on test_prep for update to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists "test_prep student delete" on test_prep;
create policy "test_prep student delete" on test_prep for delete to authenticated using (student_id = auth.uid());

notify pgrst, 'reload schema';
