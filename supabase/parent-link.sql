-- Parent progress link. Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.
-- A student can make a private read-only link for a parent. The parent sees first names, attendance, marks and upcoming sessions. No login, no chat, no files.

create table if not exists parent_links (
  student_id uuid primary key references profiles(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  created_at timestamptz not null default now()
);
alter table parent_links enable row level security;
drop policy if exists "parent link own" on parent_links;
create policy "parent link own" on parent_links for all to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

create or replace function parent_progress(t text) returns json
language plpgsql security definer set search_path = public as $$
declare sid uuid; r json;
begin
  select student_id into sid from parent_links where token = t;
  if sid is null then return null; end if;
  select json_build_object(
    'student', coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Student'),
    'tier', p.tier,
    'present', (select count(*) from attendance a where a.student_id = sid and a.status = 'present'),
    'absent', (select count(*) from attendance a where a.student_id = sid and a.status <> 'present'),
    'marks', coalesce((select json_agg(json_build_object('subject', m.subject, 'title', m.title, 'pct', round(m.mark / m.out_of * 100), 'on', m.taken_on) order by m.taken_on desc)
                       from (select * from marks where student_id = sid order by taken_on desc limit 20) m), '[]'::json),
    'upcoming', coalesce((select json_agg(json_build_object('subject', s.subject, 'date', s.session_date, 'time', s.session_time, 'format', s.format,
                       'tutor', (select split_part(full_name, ' ', 1) from profiles where id = s.tutor_id)) order by s.session_date)
                       from scheduled_sessions s where s.student_id = sid and s.session_date >= current_date), '[]'::json),
    'awards', coalesce((select json_agg(json_build_object('kind', a.kind, 'subject', a.subject, 'term', a.term)) from awards a where a.student_id = sid and a.published), '[]'::json)
  ) into r from profiles p where p.id = sid;
  return r;
end $$;
grant execute on function parent_progress(text) to anon, authenticated;

notify pgrst, 'reload schema';
