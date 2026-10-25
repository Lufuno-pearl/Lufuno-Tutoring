-- Tutor payouts: the owners mark a tutor's month as paid (high school and varsity separately),
-- and the tutor sees "Paid" on their side.
-- Run once in Supabase: SQL Editor > New query > paste > Run
drop table if exists tutor_payouts;
create table tutor_payouts (
  tutor_id uuid not null references auth.users(id) on delete cascade,
  month text not null,                      -- like 2026-10
  level text not null check (level in ('hs', 'uni')),
  amount numeric(10,2) not null,
  paid_at timestamptz not null default now(),
  paid_by uuid references auth.users(id),
  primary key (tutor_id, month, level)
);
alter table tutor_payouts enable row level security;
create policy "payout read own or owner" on tutor_payouts for select using (tutor_id = auth.uid() or is_owner());
create policy "payout owner add" on tutor_payouts for insert with check (is_owner());
create policy "payout owner edit" on tutor_payouts for update using (is_owner()) with check (is_owner());
create policy "payout owner remove" on tutor_payouts for delete using (is_owner());
notify pgrst, 'reload schema';
