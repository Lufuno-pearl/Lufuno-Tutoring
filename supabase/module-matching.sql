-- Module matching + "Make tutor". Run after tutor-applications.sql.
alter table profiles add column if not exists teaches text[] default '{}';

create table if not exists tutor_modules (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references profiles(id) on delete cascade,
  module_name text not null,
  mark integer,
  year text,
  created_at timestamptz not null default now()
);
create unique index if not exists tutor_modules_unique on tutor_modules (tutor_id, lower(module_name));
alter table tutor_modules enable row level security;
drop policy if exists "tutor modules read" on tutor_modules;
create policy "tutor modules read" on tutor_modules for select to authenticated using (tutor_id = auth.uid() or is_owner());

-- Owners only: turn an accepted applicant into a tutor and copy their subjects and modules across.
create or replace function make_tutor(app_id uuid) returns boolean as $$
declare a tutor_applications%rowtype;
begin
  if not is_owner() then raise exception 'Only the owners can do this'; end if;
  select * into a from tutor_applications where id = app_id and status = 'accepted';
  if not found then raise exception 'Application is not accepted'; end if;
  update profiles set role = 'partner', teaches = a.hs_subjects where id = a.user_id;
  insert into tutor_modules (tutor_id, module_name, mark, year)
    select a.user_id, m->>'subject', (m->>'mark')::numeric::int, m->>'year'
    from jsonb_array_elements(a.marks) m
    where m->>'level' = 'uni'
    on conflict (tutor_id, lower(module_name)) do update set mark = excluded.mark, year = excluded.year;
  return true;
end;
$$ language plpgsql security definer;

notify pgrst, 'reload schema';
