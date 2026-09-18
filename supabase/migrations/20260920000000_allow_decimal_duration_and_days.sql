-- Migration: 20260920000000_allow_decimal_duration_and_days.sql
-- Purpose: Convert duration_months column from integer to numeric(8,2)
-- to allow short-term / decimal investment periods (e.g. 0.1 for 3 days, 0.3 for 9 days, 0.5 for 15 days)
-- and update maturity date calculation in create_investment to use days instead of integer months.

-- 1. Alter farm_projects duration_months to numeric(8,2)
alter table public.farm_projects 
  alter column duration_months type numeric(8,2) using duration_months::numeric(8,2);

-- Set default to 12.00
alter table public.farm_projects 
  alter column duration_months set default 12.00;

-- 2. Update create_investment to safely calculate maturity date in days
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
  daily_ret numeric;
  total_ret numeric;
  lock_days int;
  lock_enabled boolean;
  v_locked numeric;
  v_claimable numeric;
  inv_id uuid;
  duration_days int;
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

  -- Calculate duration in days (minimum 1 day)
  duration_days := greatest(1, round(coalesce(proj.duration_months, 12)::numeric * 30)::int);

  -- Calculate daily return from progressive investment-based formula
  daily_ret := public.calculate_investment_daily_return(p_amount);
  total_ret := round(daily_ret * duration_days, 2);

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

  -- Create active investment with day-accurate maturity date
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
    now() + make_interval(days => duration_days),
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
      'expected_return', total_ret,
      'duration_days', duration_days
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
      '. Configured daily return: UGX ' || to_char(daily_ret, 'FM999,999,999') || ' / day (' || duration_days || ' days).'
  );

  return inv_id;
end;
$$;

grant execute on function public.create_investment(uuid, numeric) to authenticated;
grant execute on function public.create_investment(uuid, numeric) to service_role;
