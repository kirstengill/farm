alter table public.farm_projects
  add column if not exists withdrawal_lock_days int not null default 7;

alter table public.farm_projects
  drop constraint if exists farm_projects_withdrawal_lock_days_check;

alter table public.farm_projects
  add constraint farm_projects_withdrawal_lock_days_check
  check (withdrawal_lock_days >= 0);

create or replace function public.credit_daily_investment_rewards()
returns void
language plpgsql security definer set search_path = public as $$
begin
  return;
end $$;

create or replace function public.claim_investment_returns(p_investment_id uuid)
returns numeric
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  inv record;
  reward_day date;
  first_reward_day date;
  last_reward_day date;
  reward_amount numeric;
  claimed_amount numeric := 0;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select i.id, i.user_id, i.farm_id, i.amount, i.status, i.start_date, i.maturity_date,
         p.expected_return_pct, p.duration_months, p.withdrawal_lock_days
  into inv
  from public.investments i
  join public.farm_projects p on p.id = i.farm_id
  where i.id = p_investment_id and i.user_id = uid
  for update;

  if not found then raise exception 'Investment not found'; end if;
  if inv.status <> 'active' then raise exception 'Investment is not active'; end if;

  first_reward_day := (coalesce(inv.start_date, now()) + make_interval(days => inv.withdrawal_lock_days))::date;
  if now() < coalesce(inv.start_date, now()) + make_interval(days => inv.withdrawal_lock_days) then
    raise exception 'Returns locked until %', to_char(
      coalesce(inv.start_date, now()) + make_interval(days => inv.withdrawal_lock_days),
      'YYYY-MM-DD HH24:MI'
    );
  end if;

  last_reward_day := least(current_date, coalesce(inv.maturity_date::date, current_date));
  reward_amount := round(
    inv.amount * (inv.expected_return_pct / 100.0) / nullif(inv.duration_months * 30, 0),
    2
  );

  if coalesce(reward_amount, 0) <= 0 then return 0; end if;
  if reward_amount < 5000 then
    raise exception 'Daily return must be at least UGX 5,000';
  end if;

  for reward_day in
    select day::date
    from generate_series(first_reward_day, last_reward_day, interval '1 day') as days(day)
    where not exists (
      select 1
      from public.transactions t
      where t.user_id = uid
        and t.type = 'return'
        and t.meta->>'investment_id' = inv.id::text
        and t.meta->>'reward_day' = to_char(day, 'YYYY-MM-DD')
    )
  loop
    update public.wallets
      set balance = balance + reward_amount,
          total_returns = total_returns + reward_amount,
          updated_at = now()
      where user_id = uid;

    insert into public.transactions (user_id, type, amount, status, reference, method, meta)
    values (
      uid,
      'return',
      reward_amount,
      'completed',
      'REWARD-' || left(inv.id::text, 8) || '-' || to_char(reward_day, 'YYYY-MM-DD'),
      'wallet',
      jsonb_build_object(
        'investment_id', inv.id,
        'farm_id', inv.farm_id,
        'reward_day', to_char(reward_day, 'YYYY-MM-DD'),
        'source', 'daily_reward_claim'
      )
    );

    claimed_amount := claimed_amount + reward_amount;
  end loop;

  return claimed_amount;
end $$;