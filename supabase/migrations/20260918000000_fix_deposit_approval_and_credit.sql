-- ==============================================================================
-- Migration: Fix Deposit Approval Ambiguity and Automatic Wallet Credit
-- ==============================================================================
-- Resolves PostgreSQL error:
-- "Could not choose the best candidate function between:
--  public.admin_review_funds(p_tx_id => text, p_action => text),
--  public.admin_review_funds(p_tx_id => uuid, p_action => text)"
--
-- Why: PostgREST passes JSON arguments as strings. Having two overloaded
-- functions with identical parameter names confuses the query planner.
-- Fix: Drop BOTH overloaded versions and keep ONE unified text-based function
-- that safely handles both UUIDs and reference strings.
-- ==============================================================================

-- 1. Ensure transactions status constraint supports 'approved', 'completed', 'pending', 'rejected'
alter table public.transactions drop constraint if exists transactions_status_check;
alter table public.transactions add constraint transactions_status_check
  check (status in ('pending', 'approved', 'rejected', 'completed'));

-- 2. Ensure admin RLS update policies exist
drop policy if exists "transactions_admin_update" on public.transactions;
create policy "transactions_admin_update" on public.transactions
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "wallets_admin_update" on public.wallets;
create policy "wallets_admin_update" on public.wallets
  for all using (public.is_admin()) with check (public.is_admin());

-- 3. CRITICAL: Drop existing overloaded functions to eliminate ambiguity
drop function if exists public.admin_review_funds(uuid, text);
drop function if exists public.admin_review_funds(text, text);

-- 4. Unified single function with signature (p_tx_id text, p_action text)
create or replace function public.admin_review_funds(p_tx_id text, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tx record;
  v_uuid uuid;
  v_action text;
  referrer_id uuid;
  bonus_pct numeric;
  bonus_amount numeric;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  v_action := lower(trim(p_action));

  -- Try parsing p_tx_id as UUID
  begin
    v_uuid := p_tx_id::uuid;
  exception when others then
    v_uuid := null;
  end;

  -- Lock and fetch transaction either by UUID or by reference string
  if v_uuid is not null then
    select *
    into tx
    from public.transactions
    where (id = v_uuid or reference = p_tx_id) and status = 'pending'
    for update;
  else
    select *
    into tx
    from public.transactions
    where (reference = p_tx_id or id::text = p_tx_id) and status = 'pending'
    for update;
  end if;

  if not found then
    raise exception 'Transaction not found or already processed';
  end if;

  if v_action in ('approve', 'approved') then
    -- A. Mark transaction as approved
    update public.transactions
    set status = 'approved',
        updated_at = now()
    where id = tx.id;

    -- B. If it's a deposit, automatically credit investor's wallet
    if tx.type = 'deposit' then
      -- Ensure investor wallet exists
      insert into public.wallets (user_id, balance, total_invested, total_returns, updated_at)
      values (tx.user_id, 0, 0, 0, now())
      on conflict (user_id) do nothing;

      -- Credit wallet balance
      update public.wallets
      set balance = coalesce(balance, 0) + tx.amount,
          updated_at = now()
      where user_id = tx.user_id;

      -- C. Safely process referral bonus in an isolated block so it cannot abort deposit credit
      begin
        select p.referred_by
        into referrer_id
        from public.profiles p
        where p.id = tx.user_id;

        if referrer_id is not null and referrer_id <> tx.user_id then
          begin
            select greatest(0, least(100, coalesce((value #>> '{}')::numeric, 10)))
            into bonus_pct
            from public.platform_settings
            where key = 'referral_bonus_pct';
          exception when others then
            bonus_pct := 10;
          end;

          bonus_pct := coalesce(bonus_pct, 10);
          bonus_amount := round(tx.amount * bonus_pct / 100.0, 2);

          if bonus_amount > 0 then
            -- Upsert referral record
            begin
              insert into public.referrals (referrer_id, referred_id, bonus_amount, status)
              values (referrer_id, tx.user_id, bonus_amount, 'approved')
              on conflict (referrer_id, referred_id)
              do update set bonus_amount = excluded.bonus_amount,
                            status = 'approved';
            exception when others then
              null;
            end;

            -- Check if referral transaction already paid
            if not exists (
              select 1
              from public.transactions referral_tx
              where referral_tx.user_id = referrer_id
                and referral_tx.type = 'referral_bonus'
                and referral_tx.meta->>'source_deposit_id' = tx.id::text
            ) then
              -- Ensure referrer wallet exists
              insert into public.wallets (user_id, balance, total_invested, total_returns, updated_at)
              values (referrer_id, 0, 0, 0, now())
              on conflict (user_id) do nothing;

              -- Credit referrer wallet
              update public.wallets
              set balance = coalesce(balance, 0) + bonus_amount,
                  total_returns = coalesce(total_returns, 0) + bonus_amount,
                  updated_at = now()
              where user_id = referrer_id;

              -- Log referral bonus transaction
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
                referrer_id,
                'referral_bonus',
                bonus_amount,
                'approved',
                'REF-' || upper(substr(md5(tx.id::text), 1, 8)),
                'wallet',
                jsonb_build_object(
                  'source_deposit_id', tx.id,
                  'referred_id', tx.user_id,
                  'deposit_amount', tx.amount,
                  'bonus_pct', bonus_pct
                )
              );

              -- Notify referrer
              insert into public.notifications (user_id, title, body)
              values (
                referrer_id,
                'Referral Bonus Credited',
                'You received UGX ' || to_char(bonus_amount, 'FM999,999,999') ||
                  ' from an approved deposit by a referred investor.'
              );
            end if;
          end if;
        end if;
      exception when others then
        -- Never abort deposit approval due to referral bonus failure
        null;
      end;

    elsif tx.type = 'withdrawal' then
      -- Deduct from wallet if approved withdrawal
      update public.wallets
      set balance = greatest(0, coalesce(balance, 0) - tx.amount),
          updated_at = now()
      where user_id = tx.user_id;
    end if;

    -- Notification for investor
    begin
      insert into public.notifications (user_id, title, body)
      values (
        tx.user_id,
        initcap(tx.type) || ' Approved',
        'Your ' || tx.type || ' of UGX ' || to_char(tx.amount, 'FM999,999,999') || ' has been approved and credited.'
      );
    exception when others then
      null;
    end;

  elsif v_action in ('reject', 'rejected') then
    -- Mark transaction as rejected
    update public.transactions
    set status = 'rejected',
        updated_at = now()
    where id = tx.id;

    -- Notification for investor
    begin
      insert into public.notifications (user_id, title, body)
      values (
        tx.user_id,
        initcap(tx.type) || ' Rejected',
        'Your ' || tx.type || ' request for UGX ' || to_char(tx.amount, 'FM999,999,999') || ' was reviewed and rejected.'
      );
    exception when others then
      null;
    end;
  else
    raise exception 'Invalid action: %. Must be approve or reject.', p_action;
  end if;

  -- Audit log (safe from exceptions)
  begin
    insert into public.audit_logs (admin_id, action, entity, entity_id, details)
    values (
      auth.uid(),
      v_action,
      'transaction',
      tx.id,
      jsonb_build_object('type', tx.type, 'amount', tx.amount)
    );
  exception when others then
    null;
  end;
end;
$$;

-- 5. Grant execute permissions on the single function
grant execute on function public.admin_review_funds(text, text) to authenticated;
grant execute on function public.admin_review_funds(text, text) to service_role;
