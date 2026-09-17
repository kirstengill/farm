-- ==============================================================================
-- Migration: Progressive Daily Returns, Accrual & Return Lock System
-- ==============================================================================
-- 1. Daily return accumulation:
--    Active investments generate their configured daily return once per earning day.
--    Returns accumulate without resetting and remain locked during the lock period.
-- 2. Separate concepts:
--    - daily_return: amount earned per day
--    - accumulated_return: total earned to date (daily_return * earning_days)
--    - locked_return: earned returns inside the lock period
--    - claimable_return: earned returns whose lock has expired
--    - claimed_return: returns already transferred to wallet
-- 3. Investment-amount-based daily return model:
--    - 15,000 -> 5,000/day
--    - 20,000 -> 7,500/day
--    - Progressive scale for arbitrary amounts
-- ==============================================================================

-- 1. Ensure table columns exist on investments
alter table public.investments
  add column if not exists daily_return numeric(14,2) not null default 0;

alter table public.investments
  add column if not exists earning_days int not null default 0;

alter table public.investments
  add column if not exists accumulated_return numeric(14,2) not null default 0;

alter table public.investments
  add column if not exists locked_return numeric(14,2) not null default 0;

alter table public.investments
  add column if not exists claimable_return numeric(14,2) not null default 0;

alter table public.investments
  add column if not exists claimed_return numeric(14,2) not null default 0;

alter table public.investments
  add column if not exists returns_claimed_through date;

alter table public.farm_projects
  add column if not exists daily_return numeric(14,2);

-- 2. Core progressive daily return calculation function
create or replace function public.calculate_investment_daily_return(p_amount numeric)
returns numeric
language plpgsql
immutable
as $$
declare
  a numeric;
begin
  if p_amount is null or p_amount <= 0 then
    return 0;
  end if;
  a := round(p_amount);

  if a < 15000 then
    return round(a / 3.0);
  elsif a <= 20000 then
    return round(5000.0 + (a - 15000.0) * 0.5);
  elsif a <= 50000 then
    return round(7500.0 + (a - 20000.0) * 0.4);
  elsif a <= 100000 then
    return round(19500.0 + (a - 50000.0) * 0.42);
  elsif a <= 500000 then
    return round(40500.0 + (a - 100000.0) * 0.44);
  else
    return round(216500.0 + (a - 500000.0) * 0.46);
  end if;
end;
$$;

-- Grant execution
grant execute on function public.calculate_investment_daily_return(numeric) to authenticated;
grant execute on function public.calculate_investment_daily_return(numeric) to service_role;
grant execute on function public.calculate_investment_daily_return(numeric) to anon;

-- 3. Update existing farm projects to new investment-based daily return
update public.farm_projects
set daily_return = public.calculate_investment_daily_return(min_amount),
    expected_return_pct = round(
      (public.calculate_investment_daily_return(min_amount) * duration_months * 30.0 / nullif(min_amount, 0)) * 100.0,
      2
    );

-- 4. Update existing investments safely without destroying historical claimed returns
update public.investments i
set daily_return = public.calculate_investment_daily_return(i.amount),
    expected_return = round(
      public.calculate_investment_daily_return(i.amount) * coalesce(p.duration_months, 12) * 30.0,
      2
    )
from public.farm_projects p
where p.id = i.farm_id
  and i.status = 'active';

-- 5. Centralized return accrual synchronizer
create or replace function public.sync_investment_return_accruals()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  lock_days int;
  lock_enabled boolean;
  start_dt date;
  maturity_dt date;
  earned_days int;
  total_acc numeric;
  is_locked boolean;
  v_locked numeric;
  v_claimable numeric;
begin
  -- Fetch withdrawal lock settings
  select coalesce(
    (select (value)::numeric from public.platform_settings where key = 'withdrawal_lock_days'),
    7
  )::int into lock_days;

  select coalesce(
    (select (value)::boolean from public.platform_settings where key = 'withdrawal_lock_enabled'),
    true
  ) into lock_enabled;

  if not lock_enabled then
    lock_days := 0;
  end if;

  for inv in select * from public.investments where status = 'active' loop
    start_dt := coalesce(inv.start_date::date, inv.created_at::date, current_date);
    maturity_dt := coalesce(inv.maturity_date::date, current_date + 365);

    -- Calculate earning days elapsed so far (minimum 1 day for active investment)
    earned_days := greatest(1, least(current_date, maturity_dt) - start_dt + 1);
    if inv.earning_days > earned_days then
      earned_days := inv.earning_days;
    end if;

    -- Ensure daily_return is up to date
    if inv.daily_return is null or inv.daily_return <= 0 then
      inv.daily_return := public.calculate_investment_daily_return(inv.amount);
    end if;

    total_acc := round(inv.daily_return * earned_days, 2);

    -- Determine whether currently in lock period
    is_locked := (lock_days > 0 and current_date < (start_dt + lock_days));

    if is_locked then
      v_locked := greatest(0, round(total_acc - coalesce(inv.claimed_return, 0), 2));
      v_claimable := 0;
    else
      v_locked := 0;
      v_claimable := greatest(0, round(total_acc - coalesce(inv.claimed_return, 0), 2));
    end if;

    update public.investments
    set daily_return = inv.daily_return,
        earning_days = earned_days,
        accumulated_return = total_acc,
        locked_return = v_locked,
        claimable_return = v_claimable
    where id = inv.id;
  end loop;
end;
$$;

grant execute on function public.sync_investment_return_accruals() to authenticated;
grant execute on function public.sync_investment_return_accruals() to service_role;

-- Run initial synchronization
perform public.sync_investment_return_accruals();

-- 6. Updated create_investment function
create or replace function public.create_investment(p_project_id uuid, p_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  proj record;
  bal numeric;
  inv_id uuid;
  daily_ret numeric;
  total_ret numeric;
  lock_days int;
  lock_enabled boolean;
  v_locked numeric;
  v_claimable numeric;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into proj from public.farm_projects where id = p_project_id and status = 'active' for update;
  if not found then
    raise exception 'Farm project not available';
  end if;

  if p_amount < proj.min_amount then
    raise exception 'Minimum investment is %', proj.min_amount;
  end if;

  if proj.max_amount is not null and p_amount > proj.max_amount then
    raise exception 'Maximum investment is %', proj.max_amount;
  end if;

  if proj.target_amount > 0 and proj.funded_amount + p_amount > proj.target_amount then
    raise exception 'Farm project is nearly fully funded';
  end if;

  select balance into bal from public.wallets where user_id = uid for update;
  if coalesce(bal, 0) < p_amount then
    raise exception 'Insufficient wallet balance';
  end if;

  -- Calculate daily return from progressive investment-based formula
  daily_ret := public.calculate_investment_daily_return(p_amount);
  total_ret := round(daily_ret * coalesce(proj.duration_months, 12) * 30.0, 2);

  -- Determine initial lock status (day 1 return accumulates immediately)
  select coalesce(
    (select (value)::numeric from public.platform_settings where key = 'withdrawal_lock_days'),
    7
  )::int into lock_days;

  select coalesce(
    (select (value)::boolean from public.platform_settings where key = 'withdrawal_lock_enabled'),
    true
  ) into lock_enabled;

  if not lock_enabled then
    lock_days := 0;
  end if;

  if lock_days > 0 then
    v_locked := daily_ret;
    v_claimable := 0;
  else
    v_locked := 0;
    v_claimable := daily_ret;
  end if;

  -- Deduct principal from wallet
  update public.wallets
  set balance = balance - p_amount,
      total_invested = total_invested + p_amount,
      updated_at = now()
  where user_id = uid;

  -- Create active investment
  insert into public.investments (
    user_id,
    farm_id,
    amount,
    status,
    expected_return,
    daily_return,
    earning_days,
    accumulated_return,
    locked_return,
    claimable_return,
    claimed_return,
    start_date,
    maturity_date,
    reference
  )
  values (
    uid,
    p_project_id,
    p_amount,
    'active',
    total_ret,
    daily_ret,
    1,
    daily_ret,
    v_locked,
    v_claimable,
    0,
    now(),
    now() + make_interval(months => coalesce(proj.duration_months, 12)),
    'INV-' || upper(substr(md5(random()::text), 1, 8))
  )
  returning id into inv_id;

  -- Record investment transaction
  insert into public.transactions (user_id, type, amount, status, reference, method, meta)
  values (
    uid,
    'investment',
    p_amount,
    'completed',
    'INV-' || upper(substr(inv_id::text, 1, 8)),
    'wallet',
    jsonb_build_object(
      'farm_id', p_project_id,
      'daily_return', daily_ret,
      'expected_return', total_ret
    )
  );

  -- Update farm funded amount
  update public.farm_projects
  set funded_amount = funded_amount + p_amount,
      status = case when target_amount > 0 and funded_amount + p_amount >= target_amount
                    then 'funded' else status end
  where id = p_project_id;

  -- Notify investor
  insert into public.notifications (user_id, title, body)
  values (
    uid,
    'Investment Confirmed',
    'You invested UGX ' || to_char(p_amount, 'FM999,999,999') || ' in ' || proj.name ||
      '. Configured daily return: UGX ' || to_char(daily_ret, 'FM999,999,999') || ' / day.'
  );

  return inv_id;
end;
$$;

grant execute on function public.create_investment(uuid, numeric) to authenticated;
grant execute on function public.create_investment(uuid, numeric) to service_role;

-- 7. Bulletproof claim_investment_returns function
create or replace function public.claim_investment_returns(p_investment_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv record;
  lock_days int;
  lock_enabled boolean;
  start_dt date;
  unlock_dt date;
  claimable_amt numeric;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Synchronize current accruals first
  perform public.sync_investment_return_accruals();

  -- Lock investment row to prevent race conditions or double claims
  select *
  into inv
  from public.investments
  where id = p_investment_id and user_id = uid
  for update;

  if not found then
    raise exception 'Investment not found';
  end if;

  if inv.status <> 'active' then
    raise exception 'Investment is not active';
  end if;

  -- Check lock period
  select coalesce(
    (select (value)::numeric from public.platform_settings where key = 'withdrawal_lock_days'),
    7
  )::int into lock_days;

  select coalesce(
    (select (value)::boolean from public.platform_settings where key = 'withdrawal_lock_enabled'),
    true
  ) into lock_enabled;

  if not lock_enabled then
    lock_days := 0;
  end if;

  start_dt := coalesce(inv.start_date::date, inv.created_at::date, current_date);
  unlock_dt := start_dt + lock_days;

  if lock_days > 0 and current_date < unlock_dt then
    raise exception 'Investment returns are locked until %', to_char(unlock_dt, 'YYYY-MM-DD');
  end if;

  claimable_amt := coalesce(inv.claimable_return, 0);

  if claimable_amt <= 0 then
    raise exception 'No claimable returns available at this time.';
  end if;

  -- Credit user wallet spendable balance
  update public.wallets
  set balance = balance + claimable_amt,
      total_returns = total_returns + claimable_amt,
      updated_at = now()
  where user_id = uid;

  -- Record return transaction
  insert into public.transactions (
    user_id,
    type,
    amount,
    status,
    reference,
    method,
    meta
  )
  values (
    uid,
    'return',
    claimable_amt,
    'completed',
    'REWARD-' || upper(substr(inv.id::text, 1, 8)) || '-' || to_char(now(), 'YYYYMMDD-HH24MI'),
    'wallet',
    jsonb_build_object(
      'investment_id', inv.id,
      'farm_id', inv.farm_id,
      'daily_return', inv.daily_return,
      'accumulated_return', inv.accumulated_return,
      'earning_days', inv.earning_days,
      'claimed_amount', claimable_amt,
      'source', 'daily_return_claim'
    )
  );

  -- Update investment claim state (claimable becomes 0, claimed increases, locked is 0)
  update public.investments
  set returns_claimed_through = current_date,
      claimed_return = coalesce(claimed_return, 0) + claimable_amt,
      claimable_return = 0,
      locked_return = 0,
      updated_at = now()
  where id = inv.id;

  -- Notification
  insert into public.notifications (user_id, title, body)
  values (
    uid,
    'Daily Returns Claimed',
    'Successfully claimed UGX ' || to_char(claimable_amt, 'FM999,999,999') || ' in accumulated returns to your wallet.'
  );

  return claimable_amt;
end;
$$;

grant execute on function public.claim_investment_returns(uuid) to authenticated;
grant execute on function public.claim_investment_returns(uuid) to service_role;

-- 8. Test simulation helper function to advance days
create or replace function public.simulate_investment_earning_days(
  p_investment_id uuid,
  p_additional_days int default 1
)
returns record
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
  res record;
begin
  update public.investments
  set earning_days = coalesce(earning_days, 1) + greatest(1, p_additional_days)
  where id = p_investment_id
  returning * into inv;

  perform public.sync_investment_return_accruals();

  select id, daily_return, earning_days, accumulated_return, locked_return, claimable_return, claimed_return
  into res
  from public.investments
  where id = p_investment_id;

  return res;
end;
$$;

grant execute on function public.simulate_investment_earning_days(uuid, int) to authenticated;
grant execute on function public.simulate_investment_earning_days(uuid, int) to service_role;
