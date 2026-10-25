-- Missed or disputed sessions, a "delivered" mark on study packs, and owner rights on attendance.
-- Run once in Supabase: SQL Editor > New query > paste > Run
create table if not exists session_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  tutor_id uuid references profiles(id) on delete set null,
  attendance_id uuid references attendance(id) on delete set null,
  session_date date not null,
  subject text,
  note text,
  kind text not null default 'no_show',      -- no_show: nothing logged | dispute: student said no to a logged session
  status text not null default 'open',       -- open | resolved
  decision text,                             -- happened | not_happened
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table session_reports enable row level security;
drop policy if exists "report student add" on session_reports;
create policy "report student add" on session_reports for insert with check (student_id = auth.uid());
drop policy if exists "report student read" on session_reports;
create policy "report student read" on session_reports for select using (student_id = auth.uid() or is_owner());
drop policy if exists "report owner edit" on session_reports;
create policy "report owner edit" on session_reports for update using (is_owner()) with check (is_owner());

-- owners can correct attendance when they settle a dispute
drop policy if exists "attendance owner edit" on attendance;
create policy "attendance owner edit" on attendance for update using (is_owner()) with check (is_owner());
drop policy if exists "attendance owner add" on attendance;
create policy "attendance owner add" on attendance for insert with check (is_owner());

-- study packs: when the pack was sent
alter table pack_orders add column if not exists delivered_at timestamptz;
update pack_orders set delivered_at = now() where status = 'confirmed' and delivered_at is null;

notify pgrst, 'reload schema';
