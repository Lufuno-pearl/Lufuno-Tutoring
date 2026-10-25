-- In-person sessions: the student shows a QR code in the app, the tutor scans it, attendance is saved.
-- Needs join-room.sql to have been run first.
-- Run once in Supabase: SQL Editor > New query > paste > Run
create extension if not exists pgcrypto with schema extensions;

-- a private secret used to sign the codes (nobody can read it from the app)
create table if not exists qr_secret (id int primary key default 1, secret text not null default encode(extensions.gen_random_bytes(24), 'hex'));
insert into qr_secret (id) values (1) on conflict do nothing;
alter table qr_secret enable row level security;

create or replace function qr_sig(p_text text) returns text as $$
  select substr(encode(extensions.hmac(p_text::bytea, (select secret from qr_secret where id = 1)::bytea, 'sha256'), 'hex'), 1, 16)
$$ language sql stable security definer set search_path = public;

-- The student's own code. It changes every minute, so a screenshot stops working.
create or replace function my_qr_token() returns text as $$
  select auth.uid()::text || '.' || (floor(extract(epoch from now()) / 60))::bigint::text || '.' ||
    qr_sig(auth.uid()::text || '.' || (floor(extract(epoch from now()) / 60))::bigint::text)
$$ language sql stable security definer set search_path = public;

-- The tutor scans a student's code. Needs an open session today and a plan with this tutor.
create or replace function scan_student(p_token text) returns json as $$
declare
  parts text[];
  sid uuid;
  minute bigint;
  now_min bigint := floor(extract(epoch from now()) / 60)::bigint;
  rm session_rooms%rowtype;
  sname text;
begin
  if auth.uid() is null then return json_build_object('ok', false, 'reason', 'login'); end if;
  select * into rm from session_rooms where tutor_id = auth.uid() and room_date = sa_today() and ended_at is null;
  if not found then return json_build_object('ok', false, 'reason', 'closed'); end if;

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
  if not (exists (select 1 from hs_subscriptions s where s.student_id = sid and s.tutor_id = auth.uid() and s.status = 'confirmed' and s.end_date >= rm.room_date)
       or exists (select 1 from bookings b where b.student_id = sid and b.tutor_id = auth.uid() and b.status = 'confirmed')) then
    return json_build_object('ok', false, 'reason', 'notmine', 'name', sname);
  end if;

  if exists (select 1 from attendance where student_id = sid and marked_by = auth.uid() and session_date = rm.room_date and status = 'present') then
    return json_build_object('ok', true, 'name', sname, 'already', true);
  end if;
  insert into attendance (student_id, marked_by, status, session_date, student_response, joined_at, source)
  values (sid, auth.uid(), 'present', rm.room_date, 'yes', now(), 'scan');
  return json_build_object('ok', true, 'name', sname, 'already', false);
end;
$$ language plpgsql security definer set search_path = public;

-- scanned students also count as "in" on the student's Join card
create or replace function my_open_rooms() returns table(tutor_id uuid, tutor_name text, opened_at timestamptz, joined boolean, needs_code boolean) as $$
  select r.tutor_id, p.full_name, r.opened_at,
    exists (select 1 from attendance a where a.student_id = auth.uid() and a.marked_by = r.tutor_id and a.session_date = r.room_date and a.status = 'present' and a.source in ('join', 'scan')),
    (not exists (select 1 from hs_subscriptions s where s.student_id = auth.uid() and s.tutor_id = r.tutor_id and s.status = 'confirmed' and s.end_date >= r.room_date and coalesce(s.format, 'online') <> 'physical') and not exists (select 1 from bookings b where b.student_id = auth.uid() and b.tutor_id = r.tutor_id and b.status = 'confirmed' and coalesce(b.format, 'online') <> 'physical'))
  from session_rooms r
  join profiles p on p.id = r.tutor_id
  where r.room_date = sa_today() and r.ended_at is null
    and (exists (select 1 from hs_subscriptions s where s.student_id = auth.uid() and s.tutor_id = r.tutor_id and s.status = 'confirmed' and s.end_date >= r.room_date)
      or exists (select 1 from bookings b where b.student_id = auth.uid() and b.tutor_id = r.tutor_id and b.status = 'confirmed'))
$$ language sql stable security definer set search_path = public;

-- typing the room code must not double-count a student who was already scanned
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

  if not exists (select 1 from attendance where student_id = auth.uid() and marked_by = p_tutor and session_date = rm.room_date and status = 'present' and source in ('join', 'scan', 'tutor')) then
    insert into attendance (student_id, marked_by, status, session_date, student_response, joined_at, source)
    values (auth.uid(), p_tutor, 'present', rm.room_date, 'yes', now(), 'join');
  end if;
  return json_build_object('ok', true, 'link', case when physical then null else link end);
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function my_qr_token() to authenticated;
grant execute on function scan_student(text) to authenticated;
notify pgrst, 'reload schema';
