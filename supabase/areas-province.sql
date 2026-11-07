-- Provinces for physical-session areas. Run once in Supabase. Safe to run again.
alter table tutor_areas add column if not exists province text;
drop function if exists areas_with_tutors();
create or replace function areas_with_tutors() returns table(name text, province text)
language sql security definer set search_path = public as $$
  select min(name) as name, min(province) as province from tutor_areas group by lower(name), lower(coalesce(province,'')) order by min(province), min(name);
$$;
grant execute on function areas_with_tutors() to authenticated;
notify pgrst, 'reload schema';
