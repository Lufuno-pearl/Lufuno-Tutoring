-- Student ratings of tutors. Run once in Supabase: SQL Editor > New query > paste > Run
create table if not exists tutor_ratings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  tutor_id uuid not null references profiles(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  comment text,
  sessions_at_rating int not null default 0,
  created_at timestamptz not null default now(),
  constraint low_needs_comment check (stars > 2 or length(trim(coalesce(comment, ''))) >= 5)
);
create index if not exists tutor_ratings_tutor on tutor_ratings (tutor_id);
alter table tutor_ratings enable row level security;

-- Students see and add only their own. Only the two owners can read everyone's. Tutors can never read ratings.
drop policy if exists "student reads own ratings" on tutor_ratings;
create policy "student reads own ratings" on tutor_ratings for select using (student_id = auth.uid() or is_owner());
drop policy if exists "student adds own rating" on tutor_ratings;
create policy "student adds own rating" on tutor_ratings for insert with check (student_id = auth.uid());

-- Which tutors is this student due to rate? One rating for every 3 sessions marked present.
create or replace function rating_due() returns table(tutor_id uuid, tutor_name text, sessions int)
language sql security definer set search_path = public as $$
  select a.marked_by, coalesce(p.full_name, 'your tutor'), count(*)::int
  from attendance a
  join profiles p on p.id = a.marked_by and p.role = 'partner'
  where a.student_id = auth.uid() and a.status = 'present'
  group by a.marked_by, p.full_name
  having floor(count(*) / 3.0) > (select count(*) from tutor_ratings r where r.student_id = auth.uid() and r.tutor_id = a.marked_by);
$$;
grant execute on function rating_due() to authenticated;

notify pgrst, 'reload schema';
