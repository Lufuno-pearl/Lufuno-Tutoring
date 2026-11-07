-- Funi-style avatars, boy/girl choice and feelings. Safe to run again.
alter table profiles add column if not exists sex text;
alter table profiles add column if not exists avatar_look jsonb;
alter table profiles add column if not exists feeling text;
alter table profiles add column if not exists feeling_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_sex_check') then
    alter table profiles add constraint profiles_sex_check check (sex is null or sex in ('female','male'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_feeling_check') then
    alter table profiles add constraint profiles_feeling_check
      check (feeling is null or feeling in ('Feeling great','Happy','Okay','Confused','Stressed','Need help'));
  end if;
end $$;
-- Students already update their own profile ("update own profile"); tutors already read all profiles.
