-- Become a Tutor: applications, private document storage, owner review.
create or replace function is_owner() returns boolean as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in ('pearllufunomoyo@gmail.com', 'jonesneliswa@gmail.com');
$$ language sql stable;

create table if not exists tutor_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  institution text,
  year_of_study text,
  teaches_hs boolean not null default false,
  teaches_uni boolean not null default false,
  hs_subjects text[] not null default '{}',
  marks jsonb not null default '[]',
  selfie_path text,
  proof_path text,
  results_path text,
  honesty boolean not null default false,
  status text not null default 'draft' check (status in ('draft','submitted','accepted','declined','waitlist')),
  owner_note text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  decided_at timestamptz
);

alter table tutor_applications enable row level security;

drop policy if exists "applicant reads own, owners read all" on tutor_applications;
create policy "applicant reads own, owners read all" on tutor_applications for select to authenticated
  using (user_id = auth.uid() or is_owner());
drop policy if exists "applicant starts own" on tutor_applications;
create policy "applicant starts own" on tutor_applications for insert to authenticated
  with check (user_id = auth.uid() and status = 'draft');
drop policy if exists "applicant edits own draft" on tutor_applications;
create policy "applicant edits own draft" on tutor_applications for update to authenticated
  using (user_id = auth.uid() and status in ('draft','declined'))
  with check (user_id = auth.uid() and status in ('draft','submitted'));
drop policy if exists "owners decide" on tutor_applications;
create policy "owners decide" on tutor_applications for update to authenticated
  using (is_owner()) with check (is_owner());

-- Private bucket for selfies, proof of registration and results (owners only can view others')
insert into storage.buckets (id, name, public) values ('tutor-docs', 'tutor-docs', false) on conflict (id) do nothing;
drop policy if exists "tutor docs read own or owner" on storage.objects;
create policy "tutor docs read own or owner" on storage.objects for select to authenticated
  using (bucket_id = 'tutor-docs' and ((storage.foldername(name))[1] = auth.uid()::text or is_owner()));
drop policy if exists "tutor docs insert own" on storage.objects;
create policy "tutor docs insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'tutor-docs' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "tutor docs update own" on storage.objects;
create policy "tutor docs update own" on storage.objects for update to authenticated
  using (bucket_id = 'tutor-docs' and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
