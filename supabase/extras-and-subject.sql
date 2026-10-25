-- Needs is_owner() from session-reports.sql (already run).
-- Extra sessions (R50 each, max 3 per subscription) and the optional "another subject" on high school requests.
alter table public.hs_subscriptions add column if not exists extra_subject text;

create table if not exists public.session_extras (
  id uuid primary key default gen_random_uuid(),
  sub_id uuid not null references public.hs_subscriptions(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  count int not null check (count between 1 and 3),
  price int not null,
  status text not null default 'pending' check (status in ('pending','awaiting','confirmed')),
  reference text,
  created_at timestamptz not null default now()
);

alter table public.session_extras enable row level security;

drop policy if exists "extras student read" on public.session_extras;
create policy "extras student read" on public.session_extras for select
  using (student_id = auth.uid() or is_owner());

drop policy if exists "extras student insert" on public.session_extras;
create policy "extras student insert" on public.session_extras for insert
  with check (student_id = auth.uid());

drop policy if exists "extras student update" on public.session_extras;
create policy "extras student update" on public.session_extras for update
  using (student_id = auth.uid()) with check (student_id = auth.uid() and status in ('pending','awaiting'));

drop policy if exists "extras student delete unpaid" on public.session_extras;
create policy "extras student delete unpaid" on public.session_extras for delete
  using (student_id = auth.uid() and status = 'pending');

drop policy if exists "extras owner all" on public.session_extras;
create policy "extras owner all" on public.session_extras for all
  using (is_owner()) with check (is_owner());

-- tutors can read extras so their earnings include them
drop policy if exists "extras tutor read" on public.session_extras;
create policy "extras tutor read" on public.session_extras for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'partner'));
