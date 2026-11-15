-- Prize giving: owners sign once, awards are made by the owners, winners get certificates.
-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.

-- 1. The owners' signatures (drawn once on a phone, used on every certificate)
create table if not exists signatures (
  user_id uuid primary key references profiles(id) on delete cascade,
  full_name text not null,
  title text not null,
  d text not null,            -- SVG path data only (digits, M, L, spaces)
  w int not null default 300,
  h int not null default 100,
  updated_at timestamptz not null default now()
);
alter table signatures enable row level security;
drop policy if exists "signatures read" on signatures;
create policy "signatures read" on signatures for select to authenticated using (true);
drop policy if exists "signatures own write" on signatures;
create policy "signatures own write" on signatures for all to authenticated
  using (user_id = auth.uid() and is_staff()) with check (user_id = auth.uid() and is_staff());

-- 2. Awards (one row per prize a student wins; a student can win as many as they earn)
create table if not exists awards (
  id uuid primary key default gen_random_uuid(),
  number int generated always as identity,
  student_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('improved', 'never_missed', 'tutor_choice', 'top_mark')),
  level text not null default 'hs' check (level in ('hs', 'uni')),
  subject text,
  grade int,
  term text not null,
  mark_pct numeric,
  from_pct numeric,
  note text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
alter table awards enable row level security;
drop policy if exists "awards staff all" on awards;
create policy "awards staff all" on awards for all to authenticated using (is_staff()) with check (is_staff());
drop policy if exists "awards own read" on awards;
create policy "awards own read" on awards for select to authenticated using (student_id = auth.uid() and published);

-- 3. Winners list shown to every student: first name and last initial only, no marks
create or replace function prize_winners() returns table(term text, kind text, level text, subject text, grade int, name text, mine boolean)
language sql security definer set search_path = public as $$
  select a.term, a.kind, a.level, a.subject, a.grade,
         coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Student') ||
         case when position(' ' in coalesce(p.full_name, '')) > 0 then ' ' || upper(left(split_part(p.full_name, ' ', 2), 1)) || '.' else '' end,
         a.student_id = auth.uid()
    from awards a join profiles p on p.id = a.student_id
   where a.published
     and a.term = (select term from awards where published order by published_at desc limit 1)
   order by a.kind, a.subject, a.grade;
$$;
grant execute on function prize_winners() to authenticated;

notify pgrst, 'reload schema';
