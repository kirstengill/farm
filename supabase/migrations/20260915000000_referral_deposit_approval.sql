-- Server-side referral payout for approved deposits.
-- The browser only calls admin_review_funds; payout inputs come from database rows.
create or replace function public.admin_review_funds(p_tx_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tx record;
  referrer_id uuid;
  bonus_pct numeric;
  bonus_amount numeric;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select *
  into tx
  from public.transactions
  where id = p_tx_id and status = 'pending'
  for update;

  if not found then
    raise exception 'Transaction not found or already processed';
  end if;

  if p_action = 'approve' then
    update public.transactions
    set status = 'approved'
    where id = p_tx_id;

    if tx.type = 'deposit' then
      update public.wallets
      set balance = balance + tx.amount,
          updated_at = now()
      where user_id = tx.user_id;

      select p.referred_by
      into referrer_id
      from public.profiles p
      where p.id = tx.user_id;

      if referrer_id is not null and referrer_id <> tx.user_id then
        select greatest(0, least(100, coalesce((value)::numeric, 10)))
        into bonus_pct
        from public.platform_settings
        where key = 'referral_bonus_pct';

        bonus_pct := coalesce(bonus_pct, 10);
        bonus_amount := round(tx.amount * bonus_pct / 100.0, 2);

        insert into public.referrals (referrer_id, referred_id, bonus_amount, status)
        values (referrer_id, tx.user_id, bonus_amount, 'approved')
        on conflict (referrer_id, referred_id)
        do update set bonus_amount = excluded.bonus_amount,
                      status = 'approved';

        if bonus_amount > 0 and not exists (
          select 1
          from public.transactions referral_tx
          where referral_tx.user_id = referrer_id
            and referral_tx.type = 'referral_bonus'
            and referral_tx.meta->>'source_deposit_id' = tx.id::text
        ) then
          update public.wallets
          set balance = balance + bonus_amount,
              total_returns = total_returns + bonus_amount,
              updated_at = now()
          where user_id = referrer_id;

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
            'completed',
            'REF-' || upper(substr(md5(tx.id::text), 1, 8)),
            'wallet',
            jsonb_build_object(
              'source_deposit_id', tx.id,
              'referred_id', tx.user_id,
              'deposit_amount', tx.amount,
              'bonus_pct', bonus_pct
            )
          );

          insert into public.notifications (user_id, title, body)
          values (
            referrer_id,
            'Referral Bonus Credited',
            'You received UGX ' || to_char(bonus_amount, 'FM999,999,999.00') ||
              ' from an approved deposit by a referred user.'
          );
        end if;
      end if;
    elsif tx.type = 'withdrawal' then
      update public.wallets
      set balance = balance - tx.amount,
          updated_at = now()
      where user_id = tx.user_id;
    end if;

    insert into public.notifications (user_id, title, body)
    values (
      tx.user_id,
      tx.type || ' approved',
      'Your ' || tx.type || ' of ' || tx.amount || ' UGX has been approved.'
    );
  else
    update public.transactions
    set status = 'rejected'
    where id = p_tx_id;

    insert into public.notifications (user_id, title, body)
    values (
      tx.user_id,
      tx.type || ' rejected',
      'Your ' || tx.type || ' of ' || tx.amount || ' UGX was rejected. Contact support.'
    );
  end if;

  insert into public.audit_logs (admin_id, action, entity, entity_id, details)
  values (
    auth.uid(),
    p_action,
    'transaction',
    p_tx_id,
    jsonb_build_object('type', tx.type, 'amount', tx.amount)
  );
end;
$$;
