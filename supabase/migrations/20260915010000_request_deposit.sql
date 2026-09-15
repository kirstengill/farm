-- Dedicated deposit request RPC. The reference is defensive on both sides:
-- clients should provide one, while the database generates one if omitted.
create or replace function public.request_deposit(
  p_amount numeric,
  p_method text default 'mtn_mobile_money',
  p_phone text default '',
  p_reference text default null
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  min_amount numeric;
  created_transaction public.transactions;
  transaction_reference text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive';
  end if;

  select (value)::numeric
  into min_amount
  from public.platform_settings
  where key = 'min_deposit';

  if p_amount < coalesce(min_amount, 10000) then
    raise exception 'Minimum is UGX %', coalesce(min_amount, 10000);
  end if;

  transaction_reference := coalesce(
    nullif(trim(p_reference), ''),
    'DEP-' || upper(substr(md5(gen_random_uuid()::text), 1, 12))
  );

  insert into public.transactions (user_id, type, amount, status, reference, method, meta)
  values (
    uid,
    'deposit',
    p_amount,
    'pending',
    transaction_reference,
    p_method,
    jsonb_build_object(
      'phone', coalesce(p_phone, ''),
      'country', 'Uganda',
      'provider', case when p_method = 'airtel_money' then 'Airtel Money' else 'MTN Mobile Money' end
    )
  )
  returning * into created_transaction;

  insert into public.notifications (user_id, title, body)
  values (
    uid,
    'Deposit Request Submitted',
    'Your deposit of UGX ' || to_char(p_amount, 'FM999,999,999') || ' is pending review.'
  );

  return created_transaction;
end;
$$;