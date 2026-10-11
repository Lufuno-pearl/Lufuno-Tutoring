-- Run once in Supabase: SQL Editor > New query > paste > Run

create table if not exists tutor_areas (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);
create unique index if not exists tutor_areas_unique on tutor_areas (tutor_id, lower(name));

alter table tutor_areas enable row level security;

drop policy if exists "tutor reads own areas" on tutor_areas;
create policy "tutor reads own areas" on tutor_areas for select
  using (tutor_id = auth.uid() or is_tutor());

drop policy if exists "tutor adds own areas" on tutor_areas;
create policy "tutor adds own areas" on tutor_areas for insert
  with check (tutor_id = auth.uid());

drop policy if exists "tutor removes own areas" on tutor_areas;
create policy "tutor removes own areas" on tutor_areas for delete
  using (tutor_id = auth.uid());

-- Students can't read tutor_areas directly. This hands them only the area names.
create or replace function areas_with_tutors() returns table(name text)
language sql security definer set search_path = public as $$
  select min(name) as name from tutor_areas group by lower(name) order by min(name);
$$;
grant execute on function areas_with_tutors() to authenticated;

-- Where the student's chosen area is saved (safe to run if they already exist)
alter table bookings add column if not exists area text;
alter table hs_subscriptions add column if not exists area text;
