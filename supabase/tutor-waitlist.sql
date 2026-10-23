-- Waiting list for tutor applications + the "Accepting new tutors" switch.
create table if not exists app_settings (
  key text primary key,
  value text not null
);
alter table app_settings enable row level security;
drop policy if exists "settings readable" on app_settings;
create policy "settings readable" on app_settings for select to authenticated using (true);
drop policy if exists "owners change settings" on app_settings;
create policy "owners change settings" on app_settings for all to authenticated using (is_owner()) with check (is_owner());
insert into app_settings (key, value) values ('accepting_tutors', 'true') on conflict (key) do nothing;

-- applicants may now also move their own draft to the waiting list when we are full
drop policy if exists "applicant edits own draft" on tutor_applications;
create policy "applicant edits own draft" on tutor_applications for update to authenticated
  using (user_id = auth.uid() and status in ('draft','declined'))
  with check (user_id = auth.uid() and status in ('draft','submitted','waitlist'));

-- an applicant's place in the queue (they cannot read other people's rows)
create or replace function waitlist_position() returns integer as $$
  select count(*)::int from tutor_applications t, tutor_applications me
  where me.user_id = auth.uid() and me.status = 'waitlist'
    and t.status = 'waitlist' and t.submitted_at <= me.submitted_at;
$$ language sql stable security definer;

notify pgrst, 'reload schema';
