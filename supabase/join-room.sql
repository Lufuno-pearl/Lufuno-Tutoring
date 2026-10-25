-- Join the room: a tutor opens a session, students tap Join, and the app records attendance.
-- Run once in Supabase: SQL Editor > New query > paste > Run
create table if not exists session_rooms (
  tutor_id uuid not null references profiles(id) on delete cascade,
  room_date date not null,
  opened_at timestamptz not null default now(),
  ended_at timestamptz,
  code text,
  primary key (tutor_id, room_date)
);
alter table session_rooms enable row level security;
drop policy if exists "room tutor all" on session_rooms;
create policy "room tutor all" on session_rooms for all using (tutor_id = auth.uid() or is_owner()) with check (tutor_id = auth.uid() or is_owner());

alter table attendance add column if not exists joined_at timestamptz;
alter table attendance add column if not exists source text;   -- 'join' = student tapped Join, 'tutor' = tutor added or marked

-- South Africa's date, so a session near midnight still lands on the right day
create or replace function sa_today() returns date as $$
  select (now() at time zone 'Africa/Johannesburg')::date
$$ language sql stable;

-- Rooms that are open today for the logged-in student's tutors
create or replace function my_open_rooms() returns table(tutor_id uuid, tutor_name text, opened_at timestamptz, joined boolean, needs_code boolean) as $$
  select r.tutor_id, p.full_name, r.opened_at,
    exists (select 1 from attendance a where a.student_id = auth.uid() and a.marked_by = r.tutor_id and a.session_date = r.room_date and a.source = 'join'),
    (r.code is not null and not exists (select 1 from hs_subscriptions s where s.student_id = auth.uid() and s.tutor_id = r.tutor_id and s.status = 'confirmed' and s.end_date >= r.room_date and coalesce(s.format, 'online') <> 'physical') and not exists (select 1 from bookings b where b.student_id = auth.uid() and b.tutor_id = r.tutor_id and b.status = 'confirmed' and coalesce(b.format, 'online') <> 'physical'))
  from session_rooms r
  join profiles p on p.id = r.tutor_id
  where r.room_date = sa_today() and r.ended_at is null
    and (exists (select 1 from hs_subscriptions s where s.student_id = auth.uid() and s.tutor_id = r.tutor_id and s.status = 'confirmed' and s.end_date >= r.room_date)
      or exists (select 1 from bookings b where b.student_id = auth.uid() and b.tutor_id = r.tutor_id and b.status = 'confirmed'))
$$ language sql stable security definer set search_path = public;

-- The student taps Join: checks everything, saves attendance once, and hands back the meeting link
create or replace function join_session(p_tutor uuid, p_code text default null) returns json as $$
declare
  rm session_rooms%rowtype;
  link text;
  physical boolean := false;
  has_plan boolean := false;
  s hs_subscriptions%rowtype;
  b bookings%rowtype;
begin
  if auth.uid() is null then return json_build_object('ok', false, 'reason', 'login'); end if;
  select * into rm from session_rooms where tutor_id = p_tutor and room_date = sa_today() and ended_at is null;
  if not found then return json_build_object('ok', false, 'reason', 'closed'); end if;

  select * into s from hs_subscriptions where student_id = auth.uid() and tutor_id = p_tutor and status = 'confirmed' and end_date >= rm.room_date order by created_at desc limit 1;
  if found then
    has_plan := true; physical := coalesce(s.format, 'online') = 'physical'; link := s.meeting_link;
  else
    select * into b from bookings where student_id = auth.uid() and tutor_id = p_tutor and status = 'confirmed' order by created_at desc limit 1;
    if found then has_plan := true; physical := coalesce(b.format, 'online') = 'physical'; link := b.meeting_link; end if;
  end if;
  if not has_plan then return json_build_object('ok', false, 'reason', 'noplan'); end if;

  if physical then
    if rm.code is null or coalesce(trim(p_code), '') <> rm.code then return json_build_object('ok', false, 'reason', 'code'); end if;
  elsif link is null or link = '' then
    return json_build_object('ok', false, 'reason', 'nolink');
  end if;

  if not exists (select 1 from attendance where student_id = auth.uid() and marked_by = p_tutor and session_date = rm.room_date and source = 'join') then
    insert into attendance (student_id, marked_by, status, session_date, student_response, joined_at, source)
    values (auth.uid(), p_tutor, 'present', rm.room_date, 'yes', now(), 'join');
  end if;
  return json_build_object('ok', true, 'link', case when physical then null else link end);
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function my_open_rooms() to authenticated;
grant execute on function join_session(uuid, text) to authenticated;
grant execute on function sa_today() to authenticated;
notify pgrst, 'reload schema';
