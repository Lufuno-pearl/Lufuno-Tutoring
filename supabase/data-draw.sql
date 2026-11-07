-- Monthly data draw: 5 random subscribers win data each month. Safe to run again.
create table if not exists data_draws (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  student_id uuid not null references profiles(id) on delete cascade,
  drawn_at timestamptz not null default now(),
  unique (month, student_id)
);
alter table data_draws enable row level security;
drop policy if exists "data_draws staff all" on data_draws;
create policy "data_draws staff all" on data_draws for all to authenticated using (is_staff()) with check (is_staff());
drop policy if exists "data_draws own read" on data_draws;
create policy "data_draws own read" on data_draws for select to authenticated using (student_id = auth.uid());
notify pgrst, 'reload schema';
