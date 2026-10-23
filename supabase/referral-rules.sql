-- New referral rules:
--  5 friends: R50 off (once). 15 friends: R150 payout. After that, R150 for every calendar month
--  (South African time) in which the person brings 5 or more new friends, starting the month after their 15th.
create or replace function public.count_referral(p_student uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  r uuid;
  total int;
  disc boolean := false;
  pays int := 0;
  got uuid;
  first_month timestamp;
  this_month timestamp;
  mcount int;
  ym int;
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  update referrals set counted = true, counted_at = now()
    where referred_id = p_student and counted = false
    returning referrer_id into r;
  if r is null then return null; end if;
  select count(*) into total from referrals where referrer_id = r and counted;
  if total >= 5 then
    got := null;
    insert into referral_rewards (referrer_id, kind, milestone, amount) values (r, 'discount', 5, 50)
      on conflict do nothing returning id into got;
    if got is not null then disc := true; end if;
  end if;
  if total >= 15 then
    got := null;
    insert into referral_rewards (referrer_id, kind, milestone, amount) values (r, 'payout', 15, 150)
      on conflict do nothing returning id into got;
    if got is not null then pays := pays + 1; end if;
    -- monthly bonus: 5 or more new friends this month, from the month after the 15th friend
    select date_trunc('month', counted_at at time zone 'Africa/Johannesburg') into first_month
      from referrals where referrer_id = r and counted order by counted_at offset 14 limit 1;
    this_month := date_trunc('month', now() at time zone 'Africa/Johannesburg');
    if first_month is not null and this_month > first_month then
      select count(*) into mcount from referrals
        where referrer_id = r and counted
          and date_trunc('month', counted_at at time zone 'Africa/Johannesburg') = this_month;
      if mcount >= 5 then
        ym := (extract(year from this_month)::int * 100) + extract(month from this_month)::int;
        got := null;
        insert into referral_rewards (referrer_id, kind, milestone, amount) values (r, 'payout', ym, 150)
          on conflict do nothing returning id into got;
        if got is not null then pays := pays + 1; end if;
      end if;
    end if;
  end if;
  return jsonb_build_object('referrer_id', r, 'total', total, 'discount', disc, 'payouts', pays);
end $function$;

-- Lets the app show "this month: 3 of 5"
create or replace function public.my_referral_month()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  total int;
  first_month timestamp;
  this_month timestamp;
  mcount int := 0;
begin
  select count(*) into total from referrals where referrer_id = auth.uid() and counted;
  this_month := date_trunc('month', now() at time zone 'Africa/Johannesburg');
  select date_trunc('month', counted_at at time zone 'Africa/Johannesburg') into first_month
    from referrals where referrer_id = auth.uid() and counted order by counted_at offset 14 limit 1;
  select count(*) into mcount from referrals
    where referrer_id = auth.uid() and counted
      and date_trunc('month', counted_at at time zone 'Africa/Johannesburg') = this_month;
  return jsonb_build_object('total', total, 'month_count', mcount, 'bonus_open', first_month is not null and this_month > first_month);
end $function$;
grant execute on function public.my_referral_month() to authenticated;

notify pgrst, 'reload schema';
