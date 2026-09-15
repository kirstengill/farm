-- ============================================================
-- FarmWert Capital — Full database schema (run in Supabase SQL Editor)
-- Matches the frontend types & RPC calls exactly.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Helpers ----------
create or replace function public.generate_ref_code() returns text
language plpgsql volatile as $$
declare chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := ''; i int;
begin
  for i in 1..8 loop
    code := code || substr(chars, floor(random() * length(chars))::int + 1, 1);
  end loop;
  return code;
end $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;

create or replace function public.ref_code_to_user(code text) returns uuid
language sql stable security definer set search_path = public as $$
  select id from public.profiles where referral_code = upper(code) limit 1;
$$;

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null default '',
  phone text,
  role text not null default 'user' check (role in ('user','admin')),
  status text not null default 'active' check (status in ('active','blocked')),
  referral_code text unique not null default public.generate_ref_code(),
  referred_by uuid references public.profiles(id),
  withdrawal_locked_until timestamptz,
  created_at timestamptz not null default now()
);

-- Trigger: auto-create profile + wallet on signup (username stored in raw_user_meta_data)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare ref uuid;
begin
  if new.raw_user_meta_data->>'referral_code' is not null then
    ref := public.ref_code_to_user(new.raw_user_meta_data->>'referral_code');
  end if;

  insert into public.profiles (id, username, full_name, phone, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || left(new.id::text, 8)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'phone',
    ref
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Wallets ----------
create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  total_invested numeric(14,2) not null default 0,
  total_returns numeric(14,2) not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------- Farm projects ----------
create table if not exists public.farm_projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null default 'pig_farming',
  description text not null default '',
  location text not null default '',
  image_url text not null default '',
  status text not null default 'active' check (status in ('active','inactive','funded','archived')),
  min_amount numeric(14,2) not null default 50,
  max_amount numeric(14,2),
  expected_return_pct numeric(6,2) not null default 10,
  duration_months int not null default 12,
  target_amount numeric(14,2) not null default 0,
  funded_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Investments ----------
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  farm_id uuid references public.farm_projects(id) on delete set null,
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'active' check (status in ('pending','active','matured','cancelled','rejected')),
  expected_return numeric(14,2) not null default 0,
  reference text not null default ('INV-' || upper(substr(md5(random()::text),1,8))),
  start_date timestamptz default now(),
  maturity_date timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Transactions ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('deposit','withdrawal','investment','return','referral_bonus','adjustment')),
  amount numeric(14,2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected','completed')),
  reference text not null default ('TX-' || upper(substr(md5(random()::text),1,8))),
  method text,
  meta jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Referrals ----------
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  bonus_amount numeric(14,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','approved')),
  created_at timestamptz not null default now(),
  unique (referrer_id, referred_id)
);

-- ---------- Notifications ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade, -- null = broadcast
  title text not null,
  body text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- Platform settings ----------
create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (key, value) values
  ('referral_bonus_pct', '10'),
  ('min_deposit', '10000'),
  ('min_withdrawal', '20000'),
  ('withdrawal_lock_days', '3'),
  ('withdrawal_lock_enabled', 'true'),
  ('currency', '"UGX"'),
  ('brand_name', '"Feldwert Capital"')
on conflict (key) do nothing;

-- ---------- Audit log ----------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index if not exists idx_investments_user on public.investments(user_id);
create index if not exists idx_transactions_user on public.transactions(user_id);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_referrals_referrer on public.referrals(referrer_id);

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.farm_projects enable row level security;
alter table public.investments enable row level security;
alter table public.transactions enable row level security;
alter table public.referrals enable row level security;
alter table public.notifications enable row level security;
alter table public.platform_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

create policy "wallets_select_own" on public.wallets
  for select using (user_id = auth.uid() or public.is_admin());

create policy "farm_projects_select" on public.farm_projects for select using (true);
create policy "farm_projects_admin_write" on public.farm_projects
  for all using (public.is_admin()) with check (public.is_admin());

create policy "investments_select_own" on public.investments
  for select using (user_id = auth.uid() or public.is_admin());
create policy "investments_insert_own" on public.investments
  for insert with check (user_id = auth.uid());

create policy "transactions_select_own" on public.transactions
  for select using (user_id = auth.uid() or public.is_admin());

create policy "referrals_select_party" on public.referrals
  for select using (referrer_id = auth.uid() or referred_id = auth.uid() or public.is_admin());

create policy "notifications_select" on public.notifications
  for select using (user_id = auth.uid() or user_id is null);
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());

create policy "settings_select" on public.platform_settings for select using (true);
create policy "settings_admin_write" on public.platform_settings
  for all using (public.is_admin()) with check (public.is_admin());

create policy "audit_admin_read" on public.audit_logs for select using (public.is_admin());
create policy "audit_admin_write" on public.audit_logs for insert with check (public.is_admin());

-- ============================================================
-- RPCs (called by the frontend)
-- ============================================================

-- User requests deposit/withdrawal — creates pending transaction
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
  lock_days numeric; lock_enabled boolean;
  u_locked_until timestamptz; u_created_at timestamptz;
  calc_lock_until timestamptz;
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

    -- Enforce Withdrawal Lock
    select (value)::numeric into lock_days from public.platform_settings where key = 'withdrawal_lock_days';
    select (value)::boolean into lock_enabled from public.platform_settings where key = 'withdrawal_lock_enabled';
    select withdrawal_locked_until, created_at into u_locked_until, u_created_at from public.profiles where id = uid;

    if u_locked_until is not null and u_locked_until > now() then
      raise exception 'Withdrawal locked until %', to_char(u_locked_until, 'YYYY-MM-DD HH24:MI');
    elsif coalesce(lock_enabled, true) and coalesce(lock_days, 0) > 0 then
      calc_lock_until := u_created_at + make_interval(days => lock_days::int);
      if calc_lock_until > now() then
        raise exception 'Withdrawal locked until %. Platform lock period is % days.',
          to_char(calc_lock_until, 'YYYY-MM-DD HH24:MI'), lock_days;
      end if;
    end if;
  end if;

  insert into public.transactions (user_id, type, amount, status, method, meta)
  values (uid, p_type, p_amount, 'pending', p_method, jsonb_build_object('phone', p_phone, 'country', 'Uganda'));

  insert into public.notifications (user_id, title, body)
  values (uid, initcap(p_type) || ' Request Submitted',
          'Your ' || p_type || ' request of UGX ' || to_char(p_amount, 'FM999,999,999') || ' is pending review.');

  return 'Request submitted — pending admin review.';
end $$;

-- Admin approves/rejects a pending deposit/withdrawal
create or replace function public.admin_review_funds(p_tx_id uuid, p_action text)
returns void
language plpgsql security definer set search_path = public as $$
declare tx record;
begin
  if not public.is_admin() then raise exception 'Admin only'; end if;

  select * into tx from public.transactions where id = p_tx_id and status = 'pending' for update;
  if not found then raise exception 'Transaction not found or already processed'; end if;

  if p_action = 'approve' then
    update public.transactions set status = 'approved' where id = p_tx_id;

    if tx.type = 'deposit' then
      update public.wallets
        set balance = balance + tx.amount, updated_at = now()
        where user_id = tx.user_id;
    elsif tx.type = 'withdrawal' then
      update public.wallets
        set balance = balance - tx.amount, updated_at = now()
        where user_id = tx.user_id;
    end if;

    insert into public.notifications (user_id, title, body)
    values (tx.user_id, tx.type || ' approved',
            'Your ' || tx.type || ' of ' || tx.amount || ' EUR has been approved.');
  else
    update public.transactions set status = 'rejected' where id = p_tx_id;
    insert into public.notifications (user_id, title, body)
    values (tx.user_id, tx.type || ' rejected',
            'Your ' || tx.type || ' of ' || tx.amount || ' EUR was rejected. Contact support.');
  end if;

  insert into public.audit_logs (admin_id, action, entity, entity_id, details)
  values (auth.uid(), p_action, 'transaction', p_tx_id,
          jsonb_build_object('type', tx.type, 'amount', tx.amount));
end $$;

-- One-time welcome bonus for newly created accounts
create or replace function public.award_signup_bonus()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
  bonus_amount numeric := 5000;
  wallet_row public.wallets%rowtype;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  insert into public.wallets (user_id, balance, total_invested, total_returns, updated_at)
  values (uid, 0, 0, 0, now())
  on conflict (user_id) do nothing;

  select * into wallet_row from public.wallets where user_id = uid for update;

  if not exists (
    select 1 from public.transactions t
    where t.user_id = uid
      and t.type = 'adjustment'
      and t.meta ? 'signup_bonus'
  ) then
    update public.wallets
      set balance = balance + bonus_amount, updated_at = now()
      where user_id = uid;

    insert into public.transactions (user_id, type, amount, status, reference, method, meta)
    values (
      uid,
      'adjustment',
      bonus_amount,
      'completed',
      'BONUS-' || left(md5(random()::text), 8),
      'wallet',
      jsonb_build_object('signup_bonus', true, 'reason', 'welcome_bonus', 'bonus_type', 'initial_account_bonus')
    );
  end if;

  return jsonb_build_object('awarded', true, 'balance', (select balance from public.wallets where user_id = uid));
end $$;

-- Credit daily investment rewards once per investment per calendar day
create or replace function public.credit_daily_investment_rewards()
returns void
language plpgsql security definer set search_path = public as $$
declare inv record; reward_amount numeric; reward_day text;
begin
  reward_day := to_char(current_date, 'YYYY-MM-DD');

  for inv in
    select i.id, i.user_id, i.farm_id, i.amount, i.status, p.expected_return_pct, p.duration_months
    from public.investments i
    join public.farm_projects p on p.id = i.farm_id
    where i.status = 'active'
  loop
    if not exists (
      select 1
      from public.transactions t
      where t.user_id = inv.user_id
        and t.type = 'return'
        and t.meta->>'investment_id' = inv.id::text
        and t.meta->>'reward_day' = reward_day
    ) then
      reward_amount := round(
        inv.amount * (inv.expected_return_pct / 100.0) / nullif(inv.duration_months * 30, 0),
        2
      );

      if coalesce(reward_amount, 0) > 0 then
        update public.wallets
          set balance = balance + reward_amount,
              total_returns = total_returns + reward_amount,
              updated_at = now()
          where user_id = inv.user_id;

        insert into public.transactions (user_id, type, amount, status, reference, method, meta)
        values (
          inv.user_id,
          'return',
          reward_amount,
          'completed',
          'REWARD-' || left(inv.id::text, 8) || '-' || reward_day,
          'wallet',
          jsonb_build_object(
            'investment_id', inv.id,
            'farm_id', inv.farm_id,
            'reward_day', reward_day,
            'source', 'daily_reward'
          )
        );
      end if;
    end if;
  end loop;
end $$;

-- User invests in a farm project (deducts wallet, creates investment + tx + progress)
create or replace function public.create_investment(p_project_id uuid, p_amount numeric)
returns uuid
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
  proj record; bal numeric; inv_id uuid; ret numeric;
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

  ret := round(p_amount * proj.expected_return_pct / 100, 2);

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
          'You invested ' || p_amount || ' EUR in ' || proj.name || '.');

  return inv_id;
end $$;

-- ============================================================
-- Seed: initial farm projects (pig + goat farming)
-- ============================================================
insert into public.farm_projects (slug, name, category, description, location, image_url,
  min_amount, max_amount, expected_return_pct, duration_months, target_amount, funded_amount, status)
values
  ('bavarian-ridge-pig-farm', 'Bavarian Ridge Pig Farm', 'pig_farming',
   'A modern free-range pig farming operation in the Bavarian countryside with premium meat supply contracts.',
   'Lower Bavaria, Germany', '',
   100, 10000, 14.5, 12, 250000, 87500, 'active'),
  ('alpine-meadow-goat-farm', 'Alpine Meadow Goat Farm', 'goat_farming',
   'Sustainable goat dairy and breeding operation supplying artisanal cheese producers across the Alps.',
   'Allgäu, Germany', '',
   100, 10000, 12.0, 9, 180000, 45000, 'active')
on conflict (slug) do nothing;

-- ============================================================
-- FINAL STEP — promote your admin account after you sign up:
--   update public.profiles set role = 'admin' where username = 'yourusername';
-- ============================================================
