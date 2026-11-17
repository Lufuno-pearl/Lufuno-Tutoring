-- Tutor's Choice: each tutor picks one student per term. Owners open nominations, review them, then add them as prizes.
-- Needs prizes.sql and is_owner() (already run). Safe to run twice.

create table if not exists prize_settings (
  id int primary key default 1 check (id = 1),
  nominations_open boolean not null default false,
  term text not null default 'Term 1, 2027'
);
insert into prize_settings (id) values (1) on conflict (id) do nothing;
alter table prize_settings enable row level security;
drop policy if exists "settings read" on prize_settings;
create policy "settings read" on prize_settings for select to authenticated using (true);
drop policy if exists "settings owner write" on prize_settings;
create policy "settings owner write" on prize_settings for all to authenticated using (is_owner()) with check (is_owner());

create table if not exists nominations (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references profiles(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  term text not null,
  reason text not null,
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tutor_id, term)
);
alter table nominations enable row level security;
drop policy if exists "nom tutor own" on nominations;
create policy "nom tutor own" on nominations for all to authenticated
  using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());
drop policy if exists "nom owner all" on nominations;
create policy "nom owner all" on nominations for all to authenticated using (is_owner()) with check (is_owner());

-- the certificate shows which tutor chose the winner
alter table awards add column if not exists chosen_by text;

notify pgrst, 'reload schema';
