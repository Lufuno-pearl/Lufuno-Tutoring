-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.

create table if not exists marks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  subject text not null,
  title text not null,
  mark numeric not null check (mark >= 0),
  out_of numeric not null check (out_of > 0),
  taken_on date not null,
  source text not null check (source in ('tutor','school')),
  added_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists marks_student on marks (student_id, taken_on);
alter table marks enable row level security;

drop policy if exists "marks read" on marks;
create policy "marks read" on marks for select to authenticated using (student_id = auth.uid() or is_staff());
drop policy if exists "marks student add" on marks;
create policy "marks student add" on marks for insert to authenticated with check (student_id = auth.uid() and source = 'school' and added_by = auth.uid());
drop policy if exists "marks staff add" on marks;
create policy "marks staff add" on marks for insert to authenticated with check (is_staff() and source = 'tutor' and added_by = auth.uid());
drop policy if exists "marks student delete" on marks;
create policy "marks student delete" on marks for delete to authenticated using (student_id = auth.uid() and source = 'school');
drop policy if exists "marks staff delete" on marks;
create policy "marks staff delete" on marks for delete to authenticated using (is_staff() and source = 'tutor');

notify pgrst, 'reload schema';
