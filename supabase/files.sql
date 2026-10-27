-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.
-- Files: notes, tests, past papers, practice questions and homework that tutors and owners share with subscribed students.

create table if not exists shared_files (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references profiles(id) on delete cascade,
  level text not null default 'hs' check (level in ('hs', 'uni')),
  subject text not null,
  category text not null check (category in ('homework', 'tests', 'past_papers', 'practice', 'notes')),
  title text not null,
  path text not null,
  created_at timestamptz not null default now()
);
create index if not exists shared_files_subject_idx on shared_files (level, subject);
alter table shared_files enable row level security;

-- can the signed-in student see a file? Only with an active plan for that subject (high school) or a confirmed booking for that module (university).
create or replace function student_sees_file(f_level text, f_subject text) returns boolean
language sql security definer set search_path = public stable as $$
  select case
    when f_level = 'hs' then exists (
      select 1 from hs_subscriptions s
      where s.student_id = auth.uid() and s.status = 'confirmed' and s.end_date >= current_date
        and (
          (lower(f_subject) = 'mathematics' and s.subject_choice in ('maths', 'both'))
          or (lower(f_subject) = 'physical sciences' and s.subject_choice in ('physics', 'both'))
          or (s.extra_subject is not null and lower(s.extra_subject) = lower(f_subject))
        )
    )
    else exists (
      select 1 from bookings b
      where b.student_id = auth.uid() and b.status = 'confirmed' and lower(b.subject) = lower(f_subject)
    )
  end
$$;
grant execute on function student_sees_file(text, text) to authenticated;

drop policy if exists "shared_files read" on shared_files;
create policy "shared_files read" on shared_files for select to authenticated
  using (is_staff() or student_sees_file(level, subject));
drop policy if exists "shared_files insert" on shared_files;
create policy "shared_files insert" on shared_files for insert to authenticated
  with check (is_staff() and uploader_id = auth.uid());
drop policy if exists "shared_files delete" on shared_files;
create policy "shared_files delete" on shared_files for delete to authenticated
  using (is_staff() and (uploader_id = auth.uid()));

-- the files themselves
insert into storage.buckets (id, name, public) values ('class-files', 'class-files', false) on conflict (id) do nothing;
drop policy if exists "class-files read" on storage.objects;
create policy "class-files read" on storage.objects for select to authenticated
  using (bucket_id = 'class-files' and (is_staff() or exists (select 1 from shared_files f where f.path = name and student_sees_file(f.level, f.subject))));
drop policy if exists "class-files insert" on storage.objects;
create policy "class-files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'class-files' and is_staff() and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "class-files delete" on storage.objects;
create policy "class-files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'class-files' and is_staff() and (storage.foldername(name))[1] = auth.uid()::text);

notify pgrst, 'reload schema';
