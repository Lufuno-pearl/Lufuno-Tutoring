-- Tutor agreement + banking details. Run once in Supabase: SQL Editor > New query > paste > Run

alter table tutor_applications add column if not exists agreement_deadline timestamptz;

create table if not exists tutor_agreements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  signed_name text not null,
  signed_at timestamptz not null default now(),
  version int not null default 1
);
alter table tutor_agreements enable row level security;
drop policy if exists "own agreement read" on tutor_agreements;
create policy "own agreement read" on tutor_agreements for select using (user_id = auth.uid() or is_owner());
drop policy if exists "own agreement sign" on tutor_agreements;
create policy "own agreement sign" on tutor_agreements for insert with check (user_id = auth.uid());

-- Banking details: only the tutor and the two owners can read them
create table if not exists tutor_bank (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_holder text not null,
  bank_name text not null,
  account_number text not null,
  account_type text not null,
  branch_code text,
  updated_at timestamptz not null default now()
);
alter table tutor_bank enable row level security;
drop policy if exists "own bank read" on tutor_bank;
create policy "own bank read" on tutor_bank for select using (user_id = auth.uid() or is_owner());
drop policy if exists "own bank add" on tutor_bank;
create policy "own bank add" on tutor_bank for insert with check (user_id = auth.uid());
drop policy if exists "own bank edit" on tutor_bank;
create policy "own bank edit" on tutor_bank for update using (user_id = auth.uid()) with check (user_id = auth.uid());

notify pgrst, 'reload schema';
