-- Run this whole file once in Supabase: Project > SQL Editor > New query > paste > Run

-- Only this email counts as the tutor. Change it if needed.
create or replace function is_tutor() returns boolean as $$
  select auth.jwt() ->> 'email' = 'pearllufunomoyo@gmail.com';
$$ language sql stable;

-- One row per signed-in user, created automatically on first login
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  uni_bookings_count int not null default 0,
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id),
  subject text not null,
  day text not null,
  time text not null,
  price int not null,
  status text not null default 'pending', -- pending | awaiting | confirmed
  created_at timestamptz not null default now()
);

create table hs_subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id),
  month text not null,
  price int not null default 600,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table pack_orders (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id),
  pack_id text not null,
  pack_name text not null,
  price int not null default 100,
  status text not null default 'pending',
  download_url text, -- only filled in by the tutor once payment is confirmed
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up
create function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Row Level Security: students only ever see their own rows; the tutor sees everything
alter table profiles enable row level security;
alter table bookings enable row level security;
alter table hs_subscriptions enable row level security;
alter table pack_orders enable row level security;

create policy "own profile or tutor" on profiles for select
  using (auth.uid() = id or is_tutor());
create policy "update own profile" on profiles for update
  using (auth.uid() = id);

create policy "own bookings or tutor" on bookings for select
  using (auth.uid() = student_id or is_tutor());
create policy "insert own booking" on bookings for insert
  with check (auth.uid() = student_id);
create policy "tutor updates bookings" on bookings for update
  using (is_tutor());

create policy "own subs or tutor" on hs_subscriptions for select
  using (auth.uid() = student_id or is_tutor());
create policy "insert own sub" on hs_subscriptions for insert
  with check (auth.uid() = student_id);
create policy "tutor updates subs" on hs_subscriptions for update
  using (is_tutor());

create policy "own orders or tutor" on pack_orders for select
  using (auth.uid() = student_id or is_tutor());
create policy "insert own order" on pack_orders for insert
  with check (auth.uid() = student_id);
create policy "tutor updates orders" on pack_orders for update
  using (is_tutor());
