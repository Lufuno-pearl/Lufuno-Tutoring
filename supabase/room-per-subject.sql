-- Sessions per group or per one-on-one student: the tutor starts "Grade 11 Physical Sciences", and only those students see Join.
-- Run once in Supabase, after join-room.sql and join-qr.sql.
alter table session_rooms drop constraint if exists session_rooms_pkey;
alter table session_rooms add column if not exists id uuid default gen_random_uuid();
update session_rooms set id = gen_random_uuid() where id is null;
alter table session_rooms alter column id set not null;
alter table session_rooms add primary key (id);
alter table session_rooms add column if not exists level text;        -- hs | uni
alter table session_rooms add column if not exists grade int;
alter table session_rooms add column if not exists subject text;      -- maths | physics | the varsity subject
alter table session_rooms add column if not exists student_id uuid;   -- set for a one-on-one session
alter table session_rooms add column if not exists label text;
alter table session_rooms add column if not exists link text;
alter table session_rooms add column if not exists in_person boolean not null default false;
delete from session_rooms where level is null and student_id is null;  -- old all-students rooms from before this change

-- who may join a room
create or replace function room_allows(r session_rooms, sid uuid) returns boolean as $$
  select case
    when r.student_id is not null then r.student_id = sid and (
      exists (select 1 from hs_subscriptions s where s.student_id = sid and s.tutor_id = r.tutor_id and s.status = 'confirmed' and s.end_date >= r.room_date)
      or exists (select 1 from bookings b where b.student_id = sid and b.tutor_id = r.tutor_id and b.status = 'confirmed'))
    when r.level = 'hs' then exists (select 1 from hs_subscriptions s where s.student_id = sid and s.tutor_id = r.tutor_id and s.status = 'confirmed' and s.end_date >= r.room_date and coalesce(s.session_type, 'group') <> 'one_on_one' and s.grade = r.grade and (s.subject_choice = r.subject or s.subject_choice = 'both'))
    when r.level = 'uni' then exists (select 1 from bookings b where b.student_id = sid and b.tutor_id = r.tutor_id and b.status = 'confirmed' and coalesce(b.session_type, 'group') <> 'one_on_one' and b.subject = r.subject)
    else false end
$$ language sql stable security definer set search_path = public;

drop function if exists my_open_rooms();
create or replace function my_open_rooms() returns table(room_id uuid, tutor_id uuid, tutor_name text, label text, opened_at timestamptz, joined boolean, in_person boolean) as $$
  select r.id, r.tutor_id, p.full_name, coalesce(r.label, 'Your session'), r.opened_at,
    exists (select 1 from attendance a where a.student_id = auth.uid() and a.marked_by = r.tutor_id and a.session_date = r.room_date and a.status = 'present'),
    r.in_person
  from session_rooms r
  join profiles p on p.id = r.tutor_id
  where r.room_date = sa_today() and r.ended_at is null and room_allows(r, auth.uid())
  order by r.opened_at desc
$$ language sql stable security definer set search_path = public;

drop function if exists join_session(uuid, text);
create or replace function join_session(p_room uuid, p_code text default null) returns json as $$
declare
  rm session_rooms%rowtype;
  link text;
begin
  if auth.uid() is null then return json_build_object('ok', false, 'reason', 'login'); end if;
  select * into rm from session_rooms where id = p_room and room_date = sa_today() and ended_at is null;
  if not found then return json_build_object('ok', false, 'reason', 'closed'); end if;
  if not room_allows(rm, auth.uid()) then return json_build_object('ok', false, 'reason', 'noplan'); end if;

  if rm.in_person then
    if rm.code is null or coalesce(trim(p_code), '') <> rm.code then return json_build_object('ok', false, 'reason', 'code'); end if;
  else
    link := nullif(rm.link, '');
    if link is null then
      select coalesce(nullif(s.meeting_link, ''), null) into link from hs_subscriptions s where s.student_id = auth.uid() and s.tutor_id = rm.tutor_id and s.status = 'confirmed' order by s.created_at desc limit 1;
    end if;
    if link is null then
      select nullif(b.meeting_link, '') into link from bookings b where b.student_id = auth.uid() and b.tutor_id = rm.tutor_id and b.status = 'confirmed' order by b.created_at desc limit 1;
    end if;
    if link is null then return json_build_object('ok', false, 'reason', 'nolink'); end if;
  end if;

  if not exists (select 1 from attendance where student_id = auth.uid() and marked_by = rm.tutor_id and session_date = rm.room_date and status = 'present') then
    insert into attendance (student_id, marked_by, status, session_date, student_response, joined_at, source)
    values (auth.uid(), rm.tutor_id, 'present', rm.room_date, 'yes', now(), 'join');
  end if;
  return json_build_object('ok', true, 'link', case when rm.in_person then null else link end);
end;
$$ language plpgsql security definer set search_path = public;

-- the tutor scans a student: works if the student belongs to one of the tutor's open in-person sessions today
create or replace function scan_student(p_token text) returns json as $$
declare
  parts text[];
  sid uuid;
  minute bigint;
  now_min bigint := floor(extract(epoch from now()) / 60)::bigint;
  rm session_rooms%rowtype;
  sname text;
  anyopen boolean;
begin
  if auth.uid() is null then return json_build_object('ok', false, 'reason', 'login'); end if;
  select exists (select 1 from session_rooms where tutor_id = auth.uid() and room_date = sa_today() and ended_at is null) into anyopen;
  if not anyopen then return json_build_object('ok', false, 'reason', 'closed'); end if;

  parts := string_to_array(coalesce(p_token, ''), '.');
  if array_length(parts, 1) <> 3 then return json_build_object('ok', false, 'reason', 'bad'); end if;
  begin
    sid := parts[1]::uuid; minute := parts[2]::bigint;
  exception when others then
    return json_build_object('ok', false, 'reason', 'bad');
  end;
  if qr_sig(parts[1] || '.' || parts[2]) <> parts[3] then return json_build_object('ok', false, 'reason', 'bad'); end if;
  if now_min - minute > 2 or minute - now_min > 1 then return json_build_object('ok', false, 'reason', 'old'); end if;

  select full_name into sname from profiles where id = sid;
  select r.* into rm from session_rooms r where r.tutor_id = auth.uid() and r.room_date = sa_today() and r.ended_at is null and room_allows(r, sid) order by r.opened_at desc limit 1;
  if not found then return json_build_object('ok', false, 'reason', 'notmine', 'name', sname); end if;

  if exists (select 1 from attendance where student_id = sid and marked_by = auth.uid() and session_date = rm.room_date and status = 'present') then
    return json_build_object('ok', true, 'name', sname, 'already', true);
  end if;
  insert into attendance (student_id, marked_by, status, session_date, student_response, joined_at, source)
  values (sid, auth.uid(), 'present', rm.room_date, 'yes', now(), 'scan');
  return json_build_object('ok', true, 'name', sname, 'already', false);
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function room_allows(session_rooms, uuid) to authenticated;
grant execute on function my_open_rooms() to authenticated;
grant execute on function join_session(uuid, text) to authenticated;
grant execute on function scan_student(text) to authenticated;
notify pgrst, 'reload schema';
