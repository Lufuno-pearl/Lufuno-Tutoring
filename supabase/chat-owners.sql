-- Run once in Supabase: SQL Editor > New query > paste > Run. Safe to run twice.
-- Each chat now belongs to one person (Lufuno, Neliswa or a tutor). Nobody else can read it.

alter table messages add column if not exists staff_id uuid references profiles(id) on delete set null;
alter table messages add column if not exists reply_to uuid references messages(id) on delete set null;
alter table notifications add column if not exists staff_id uuid references profiles(id) on delete cascade;

-- Old messages: tutor messages go to the tutor who sent them, everything else goes to Lufuno.
update messages set staff_id = sender_id where staff_id is null and sender_id is not null;
update messages set staff_id = (select id from profiles where lower(email) = 'pearllufunomoyo@gmail.com' limit 1) where staff_id is null;

-- Who a student may message: the two owners, and the tutor(s) they are assigned to.
create or replace function chat_contacts() returns table(id uuid, name text, kind text)
language sql security definer set search_path = public as $$
  select p.id, coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Owner'), 'owner'::text
    from profiles p where lower(p.email) in ('pearllufunomoyo@gmail.com', 'jonesneliswa@gmail.com')
  union
  select p.id, coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'Tutor'), 'tutor'::text
    from profiles p
   where p.id in (
     select tutor_id from bookings where student_id = auth.uid() and tutor_id is not null and status in ('pending', 'awaiting', 'confirmed')
     union
     select tutor_id from hs_subscriptions where student_id = auth.uid() and tutor_id is not null and status in ('pending', 'awaiting', 'confirmed') and (end_date is null or end_date >= current_date)
   );
$$;
grant execute on function chat_contacts() to authenticated;

-- Replace the chat rules.
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname = 'public' and tablename = 'messages' loop
    execute format('drop policy %I on messages', r.policyname);
  end loop;
end $$;
alter table messages enable row level security;

create policy "messages read own chats" on messages for select to authenticated
  using (student_id = auth.uid() or staff_id = auth.uid());

create policy "messages send" on messages for insert to authenticated
  with check (
    (sender = 'student' and student_id = auth.uid() and staff_id in (select id from chat_contacts()))
    or (sender = 'tutor' and is_staff() and staff_id = auth.uid())
  );

create policy "messages delete own" on messages for delete to authenticated
  using (
    created_at > now() - interval '30 minutes'
    and ((sender = 'student' and student_id = auth.uid()) or (sender = 'tutor' and staff_id = auth.uid()))
  );

notify pgrst, 'reload schema';
