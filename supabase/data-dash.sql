-- Data Dash: a daily 5-question speed round. Top 5 scores each month win data. Safe to run again.
create table if not exists dash_scores (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  play_date date not null,
  month text not null,
  score int not null,
  correct int not null,
  created_at timestamptz not null default now(),
  unique (student_id, play_date)
);
alter table dash_scores enable row level security;
drop policy if exists "dash own insert" on dash_scores;
create policy "dash own insert" on dash_scores for insert to authenticated with check (student_id = auth.uid());
drop policy if exists "dash own or staff read" on dash_scores;
create policy "dash own or staff read" on dash_scores for select to authenticated using (student_id = auth.uid() or is_staff());

-- Leaderboard: first name and last initial only, so students never see each other's full names.
create or replace function dash_leaderboard(p_month text) returns table(student_id uuid, name text, total bigint, plays bigint)
language sql security definer set search_path = public as $$
  select s.student_id,
         regexp_replace(coalesce(p.full_name, 'Student'), '^(\S+)\s.*?(\S)\S*$', '\1 \2.') as name,
         sum(s.score) as total,
         count(*) as plays
  from dash_scores s join profiles p on p.id = s.student_id
  where s.month = p_month
  group by s.student_id, p.full_name
  order by sum(s.score) desc, min(s.created_at) asc
  limit 200;
$$;
grant execute on function dash_leaderboard(text) to authenticated;
notify pgrst, 'reload schema';
