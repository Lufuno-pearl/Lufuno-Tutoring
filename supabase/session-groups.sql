-- Physical sessions in small groups: the tutor splits a class into groups and each group is its own session.
-- Run once, after room-per-subject.sql. Safe to run again.
alter table session_rooms add column if not exists student_ids uuid[];

create or replace function room_allows(r session_rooms, sid uuid) returns boolean as $$
  select case
    when r.student_ids is not null and cardinality(r.student_ids) > 0 then sid = any(r.student_ids) and (
      exists (select 1 from hs_subscriptions s where s.student_id = sid and s.tutor_id = r.tutor_id and s.status = 'confirmed' and s.end_date >= r.room_date)
      or exists (select 1 from bookings b where b.student_id = sid and b.tutor_id = r.tutor_id and b.status = 'confirmed'))
    when r.student_id is not null then r.student_id = sid and (
      exists (select 1 from hs_subscriptions s where s.student_id = sid and s.tutor_id = r.tutor_id and s.status = 'confirmed' and s.end_date >= r.room_date)
      or exists (select 1 from bookings b where b.student_id = sid and b.tutor_id = r.tutor_id and b.status = 'confirmed'))
    when r.level = 'hs' then exists (select 1 from hs_subscriptions s where s.student_id = sid and s.tutor_id = r.tutor_id and s.status = 'confirmed' and s.end_date >= r.room_date and coalesce(s.session_type, 'group') <> 'one_on_one' and s.grade = r.grade and (s.subject_choice = r.subject or s.subject_choice = 'both'))
    when r.level = 'uni' then exists (select 1 from bookings b where b.student_id = sid and b.tutor_id = r.tutor_id and b.status = 'confirmed' and coalesce(b.session_type, 'group') <> 'one_on_one' and b.subject = r.subject)
    else false end
$$ language sql stable security definer set search_path = public;
grant execute on function room_allows(session_rooms, uuid) to authenticated;
notify pgrst, 'reload schema';
