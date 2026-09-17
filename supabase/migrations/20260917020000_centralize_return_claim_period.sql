alter table public.investments
  add column if not exists daily_return numeric(14,2) not null default 0;

alter table public.investments
  add column if not exists returns_claimed_through date;

alter table public.investments
  add column if not exists earning_days int not null default 0;

alter table public.investments
  add column if not exists accumulated_return numeric(14,2) not null default 0;

alter table public.investments
  add column if not exists claimable_return numeric(14,2) not null default 0;

alter table public.investments
  add column if not exists claimed_return numeric(14,2) not null default 0;

alter table public.farm_projects
  add column if not exists daily_return numeric(14,2);

update public.farm_projects
set min_amount = case
  when lower(category) like '%goat%' then 15000
  when lower(category) like '%pig%' then 20000
  else min_amount
end
where lower(category) like '%goat%'
   or lower(category) like '%pig%';

alter table public.farm_projects
  drop column if exists withdrawal_lock_days;

update public.investments i
set daily_return = round(
  i.amount * (p.expected_return_pct / 100.0) / nullif(p.duration_months * 30, 0),
  2
)
from public.farm_projects p
where p.id = i.farm_id
  and i.daily_return = 0;

update public.farm_projects
set daily_return = case
  when min_amount = 15000 then 5000
  when min_amount = 20000 then 7500
  else round(min_amount * (expected_return_pct / 100.0) / nullif(duration_months * 30, 0), 2)
end
where daily_return is null;

update public.farm_projects
set daily_return = case
  when min_amount = 15000 then 5000
  when min_amount = 20000 then 7500
  else daily_return
end;

update public.investments i
set daily_return = round(p.daily_return * i.amount / nullif(p.min_amount, 0), 2),
    expected_return = round(
      (p.daily_return * i.amount / nullif(p.min_amount, 0)) * p.duration_months * 30,
      2
    )
from public.farm_projects p
where p.id = i.farm_id
  and p.daily_return is not null;

create or replace function public.sync_investment_return_accruals()
returns void
language plpgsql security definer set search_path = public as $$
declare
  inv record;
  lock_days int;
  eligible_through date;
  earned_days int;
  total_return numeric;
begin
  select coalesce(
    (select (value)::numeric from public.platform_settings where key = 'withdrawal_lock_days'),
    0
  )::int into lock_days;

  for inv in select * from public.investments where status = 'active' loop
    eligible_through := least(
      current_date - greatest(lock_days, 0),
      coalesce(inv.maturity_date::date, current_date)
    );
    earned_days := greatest(0, eligible_through - coalesce(inv.start_date::date, current_date) + 1);
    total_return := round(inv.daily_return * earned_days, 2);

    update public.investments
    set earning_days = earned_days,
        accumulated_return = total_return,
        claimable_return = greatest(0, total_return - claimed_return)
    where id = inv.id;
  end loop;
end $$;

create or replace function public.create_investment(p_project_id uuid, p_amount numeric)
returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
  proj record; bal numeric; inv_id uuid; ret numeric; daily_ret numeric;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select * into proj from public.farm_projects where id = p_project_id and status = 'active' for update;
  if not found then raise exception 'Farm project not available'; end if;
  if p_amount < proj.min_amount then raise exception 'Minimum investment is %', proj.min_amount; end if;
  if proj.max_amount is not null and p_amount > proj.max_amount then
    raise exception 'Maximum investment is %', proj.max_amount;
  end if;
  if proj.target_amount > 0 and proj.funded_amount + p_amount > proj.target_amount then
    raise exception 'Farm is nearly fully funded';
  end if;

  select balance into bal from public.wallets where user_id = uid for update;
  if coalesce(bal, 0) < p_amount then raise exception 'Insufficient wallet balance'; end if;

  daily_ret := coalesce(
    round(proj.daily_return * p_amount / nullif(proj.min_amount, 0), 2),
    round(p_amount * (proj.expected_return_pct / 100.0) / nullif(proj.duration_months * 30, 0), 2)
  );
  ret := round(daily_ret * proj.duration_months * 30, 2);

  update public.wallets
    set balance = balance - p_amount, total_invested = total_invested + p_amount, updated_at = now()
    where user_id = uid;

  insert into public.investments (
    user_id, farm_id, amount, status, expected_return, daily_return,
    earning_days, accumulated_return, claimable_return, claimed_return, maturity_date
  )
  values (uid, p_project_id, p_amount, 'active', ret, daily_ret, 0, 0, 0, 0,
    now() + make_interval(months => proj.duration_months))
  returning id into inv_id;

  insert into public.transactions (user_id, type, amount, status, reference, meta)
  values (uid, 'investment', p_amount, 'completed', 'INV-' || left(inv_id::text, 8),
    jsonb_build_object('farm_id', p_project_id, 'daily_return', daily_ret));

  update public.farm_projects
    set funded_amount = funded_amount + p_amount,
        status = case when target_amount > 0 and funded_amount + p_amount >= target_amount
                      then 'funded' else status end
    where id = p_project_id;

  insert into public.notifications (user_id, title, body)
  values (uid, 'Investment confirmed',
    'You invested ' || p_amount || ' UGX in ' || proj.name || '. Daily return: UGX ' || daily_ret || '.');

  return inv_id;
end $$;

create or replace function public.claim_investment_returns(p_investment_id uuid)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  inv record;
  lock_days int;
  claim_from date;
  claim_to date;
  days_count int;
  claimed_amount numeric;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  perform public.sync_investment_return_accruals();

  select i.*
  into inv
  from public.investments i
  where i.id = p_investment_id and i.user_id = uid
  for update;

  if not found then raise exception 'Investment not found'; end if;
  if inv.status <> 'active' then raise exception 'Investment is not active'; end if;

  select coalesce(
    (select (value)::numeric from public.platform_settings where key = 'withdrawal_lock_days'),
    0
  )::int into lock_days;

  claim_from := coalesce(inv.returns_claimed_through + 1, inv.start_date::date);
  if current_date < claim_from + greatest(lock_days, 0) then
    raise exception 'Returns are not yet claimable';
  end if;

  claim_to := least(current_date - greatest(lock_days, 0), coalesce(inv.maturity_date::date, current_date));
  if claim_to < claim_from then return 0; end if;

  days_count := claim_to - claim_from + 1;
  claimed_amount := least(round(inv.daily_return * days_count, 2), inv.claimable_return);
  if claimed_amount < 5000 then raise exception 'Daily return must be at least UGX 5,000'; end if;

  update public.wallets
    set balance = balance + claimed_amount,
        total_returns = total_returns + claimed_amount,
        updated_at = now()
    where user_id = uid;

  insert into public.transactions (user_id, type, amount, status, reference, method, meta)
  values (
    uid, 'return', claimed_amount, 'completed',
    'REWARD-' || left(inv.id::text, 8) || '-' || to_char(claim_to, 'YYYY-MM-DD'),
    'wallet', jsonb_build_object(
      'investment_id', inv.id,
      'farm_id', inv.farm_id,
      'from_day', to_char(claim_from, 'YYYY-MM-DD'),
      'through_day', to_char(claim_to, 'YYYY-MM-DD'),
      'daily_return', inv.daily_return,
      'days', days_count,
      'source', 'daily_reward_claim'
    )
  );

  update public.investments
    set returns_claimed_through = claim_to,
      claimed_return = claimed_return + claimed_amount,
      claimable_return = claimable_return - claimed_amount
    where id = inv.id;

  return claimed_amount;
end $$;