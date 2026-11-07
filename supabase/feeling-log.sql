-- History of how each student felt, so tutors can see the pattern. Run after funi-style.sql. Safe to run again.
create table if not exists feeling_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  feeling text not null check (feeling in ('Feeling great','Happy','Okay','Confused','Stressed','Need help')),
  created_at timestamptz not null default now()
);
create index if not exists feeling_log_student_idx on feeling_log (student_id, created_at desc);
alter table feeling_log enable row level security;
drop policy if exists "feeling_log own insert" on feeling_log;
create policy "feeling_log own insert" on feeling_log for insert to authenticated with check (student_id = auth.uid());
drop policy if exists "feeling_log read own or staff" on feeling_log;
create policy "feeling_log read own or staff" on feeling_log for select to authenticated using (student_id = auth.uid() or is_staff());
notify pgrst, 'reload schema';
