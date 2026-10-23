-- Level lock: once a student has picked high school or university, only the owners
-- (or you in the SQL Editor) can change it.
create or replace function lock_tier() returns trigger as $$
begin
  if old.tier is not null and new.tier is distinct from old.tier
     and auth.uid() is not null and not is_owner() then
    raise exception 'Your level is locked. Message us if you picked the wrong one.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists profiles_lock_tier on profiles;
create trigger profiles_lock_tier before update of tier on profiles
  for each row execute function lock_tier();

notify pgrst, 'reload schema';
