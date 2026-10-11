-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.

create table if not exists uni_modules (
  id uuid primary key default gen_random_uuid(),
  university text not null,
  year smallint not null check (year between 1 and 4),
  field text not null,
  name text not null,
  code text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create unique index if not exists uni_modules_unique on uni_modules (lower(university), year, lower(field), lower(name));
alter table uni_modules enable row level security;

drop policy if exists "uni_modules read" on uni_modules;
create policy "uni_modules read" on uni_modules for select to authenticated using (true);
drop policy if exists "uni_modules add" on uni_modules;
create policy "uni_modules add" on uni_modules for insert to authenticated with check (created_by = auth.uid());
drop policy if exists "uni_modules staff edit" on uni_modules;
create policy "uni_modules staff edit" on uni_modules for update to authenticated using (is_staff());
drop policy if exists "uni_modules staff delete" on uni_modules;
create policy "uni_modules staff delete" on uni_modules for delete to authenticated using (is_staff());

create table if not exists module_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  module_id uuid not null references uni_modules(id) on delete cascade,
  session_type text not null default 'group' check (session_type in ('group','one_on_one')),
  format text not null default 'online' check (format in ('online','physical')),
  area text,
  day text,
  time text,
  status text not null default 'requested' check (status in ('requested','available','unavailable')),
  tutor_id uuid,
  booking_id uuid,
  created_at timestamptz not null default now()
);
alter table module_requests enable row level security;

drop policy if exists "module_requests student add" on module_requests;
create policy "module_requests student add" on module_requests for insert to authenticated with check (student_id = auth.uid());
drop policy if exists "module_requests read" on module_requests;
create policy "module_requests read" on module_requests for select to authenticated using (student_id = auth.uid() or is_staff());
drop policy if exists "module_requests staff update" on module_requests;
create policy "module_requests staff update" on module_requests for update to authenticated using (is_staff());

-- lets staff create the payable booking for a student once a tutor is confirmed
drop policy if exists "bookings staff insert" on bookings;
create policy "bookings staff insert" on bookings for insert to authenticated with check (is_staff());

-- starting Wits modules (year and subject area are best guesses: fix them in Table Editor > uni_modules if needed)
insert into uni_modules (university, year, field, name) values
  ('Wits', 2, 'Mathematics', 'Basic Analysis'),
  ('Wits', 2, 'Mathematics', 'Multi-Variable Calculus'),
  ('Wits', 2, 'Applied Mathematics', 'Mathematical Modelling & Methods'),
  ('Wits', 2, 'Computer Science', 'Scientific Computing'),
  ('Wits', 2, 'Mathematics', 'Abstract Mathematics'),
  ('Wits', 2, 'Statistics', 'Statistics')
on conflict do nothing;

notify pgrst, 'reload schema';
