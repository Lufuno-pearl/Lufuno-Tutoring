-- Tutor payouts: lets the owners mark a tutor's month as paid, and the tutor sees "Paid" on their side.
-- Run once in Supabase: SQL Editor > New query > paste > Run
create table if not exists tutor_payouts (
  tutor_id uuid not null references auth.users(id) on delete cascade,
  month text not null,                      -- like 2026-10
  amount numeric(10,2) not null,
  paid_at timestamptz not null default now(),
  paid_by uuid references auth.users(id),
  primary key (tutor_id, month)
);
alter table tutor_payouts enable row level security;
drop policy if exists "payout read own or owner" on tutor_payouts;
create policy "payout read own or owner" on tutor_payouts for select using (tutor_id = auth.uid() or is_owner());
drop policy if exists "payout owner add" on tutor_payouts;
create policy "payout owner add" on tutor_payouts for insert with check (is_owner());
drop policy if exists "payout owner edit" on tutor_payouts;
create policy "payout owner edit" on tutor_payouts for update using (is_owner()) with check (is_owner());
drop policy if exists "payout owner remove" on tutor_payouts;
create policy "payout owner remove" on tutor_payouts for delete using (is_owner());
notify pgrst, 'reload schema';
