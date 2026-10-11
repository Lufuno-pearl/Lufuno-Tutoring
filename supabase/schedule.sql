-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.

create table if not exists scheduled_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  tutor_id uuid references profiles(id) on delete set null,
  subject text not null,
  session_date date not null,
  session_time text not null,
  format text not null default 'online' check (format in ('online','physical')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists scheduled_sessions_student on scheduled_sessions (student_id, session_date);
alter table scheduled_sessions enable row level security;

drop policy if exists "scheduled read" on scheduled_sessions;
create policy "scheduled read" on scheduled_sessions for select to authenticated using (student_id = auth.uid() or is_staff());
drop policy if exists "scheduled staff add" on scheduled_sessions;
create policy "scheduled staff add" on scheduled_sessions for insert to authenticated with check (is_staff());
drop policy if exists "scheduled staff delete" on scheduled_sessions;
create policy "scheduled staff delete" on scheduled_sessions for delete to authenticated using (is_staff());

notify pgrst, 'reload schema';
