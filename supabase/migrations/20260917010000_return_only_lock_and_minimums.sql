update public.farm_projects
set min_amount = case
  when category in ('pig_farming', 'Pig Farming') then 30000
  when category in ('goat_farming', 'Cattle', 'Broilers') then 20000
  else 15000
end
where min_amount < 15000;

create or replace function public.request_funds(
  p_type text,
  p_amount numeric,
  p_method text default 'mtn_mobile_money',
  p_phone text default ''
)
returns text
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
  bal numeric; min_amount numeric;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;

  select (value)::numeric into min_amount from public.platform_settings
    where key = case when p_type = 'deposit' then 'min_deposit' else 'min_withdrawal' end;
  if p_amount < coalesce(min_amount, case when p_type = 'deposit' then 10000 else 20000 end) then
    raise exception 'Minimum is UGX %', coalesce(min_amount, 20000);
  end if;

  if p_type = 'withdrawal' then
    select balance into bal from public.wallets where user_id = uid for update;
    if coalesce(bal, 0) < p_amount then raise exception 'Insufficient balance'; end if;
  end if;

  insert into public.transactions (user_id, type, amount, status, method, meta)
  values (uid, p_type, p_amount, 'pending', p_method,
    jsonb_build_object('phone', p_phone, 'country', 'Uganda'));

  insert into public.notifications (user_id, title, body)
  values (uid, initcap(p_type) || ' Request Submitted',
    'Your ' || p_type || ' request of UGX ' || to_char(p_amount, 'FM999,999,999') || ' is pending review.');

  return 'Request submitted — pending admin review.';
end $$;

create or replace function public.create_investment(p_project_id uuid, p_amount numeric)
returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
  proj record; bal numeric; inv_id uuid; ret numeric;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select * into proj from public.farm_projects where id = p_project_id and status = 'active' for update;
  if not found then raise exception 'Farm project not available'; end if;
  if proj.min_amount < 15000 then raise exception 'Product minimum investment is invalid'; end if;
  if p_amount < proj.min_amount then raise exception 'Minimum investment is %', proj.min_amount; end if;
  if proj.max_amount is not null and p_amount > proj.max_amount then
    raise exception 'Maximum investment is %', proj.max_amount;
  end if;
  if proj.target_amount > 0 and proj.funded_amount + p_amount > proj.target_amount then
    raise exception 'Farm is nearly fully funded';
  end if;

  select balance into bal from public.wallets where user_id = uid for update;
  if coalesce(bal, 0) < p_amount then raise exception 'Insufficient wallet balance'; end if;

  ret := round(p_amount * proj.expected_return_pct / 100, 2);
  if round(ret / nullif(proj.duration_months * 30, 0), 2) < 5000 then
    raise exception 'Daily return must be at least UGX 5,000';
  end if;
  update public.wallets
    set balance = balance - p_amount, total_invested = total_invested + p_amount, updated_at = now()
    where user_id = uid;

  insert into public.investments (user_id, farm_id, amount, status, expected_return, maturity_date)
  values (uid, p_project_id, p_amount, 'active', ret,
    now() + make_interval(months => proj.duration_months))
  returning id into inv_id;

  insert into public.transactions (user_id, type, amount, status, reference)
  values (uid, 'investment', p_amount, 'completed', 'INV-' || left(inv_id::text, 8));

  update public.farm_projects
    set funded_amount = funded_amount + p_amount,
        status = case when target_amount > 0 and funded_amount + p_amount >= target_amount
                      then 'funded' else status end
    where id = p_project_id;

  insert into public.notifications (user_id, title, body)
  values (uid, 'Investment confirmed',
    'You invested ' || p_amount || ' UGX in ' || proj.name || '.');

  return inv_id;
end $$;