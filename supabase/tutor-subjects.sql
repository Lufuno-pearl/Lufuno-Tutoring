-- Lets students see which other subjects our tutors teach (for the "another subject" picker).
-- Safe to run more than once. Only subject names are returned, never who teaches them.
create or replace function tutor_subjects() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct trim(s) order by trim(s)), '{}')
  from profiles p, unnest(coalesce(p.teaches, '{}')) as s
  where p.role = 'partner'
    and trim(s) <> ''
    and lower(trim(s)) not in ('mathematics', 'maths', 'math', 'physical sciences', 'physical science', 'physics');
$$;
grant execute on function tutor_subjects() to authenticated;
