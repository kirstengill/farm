-- Use one percentage-based daily return rule everywhere.
-- UGX 15,000 earns approximately UGX 1,850 per day (12.3333%).

create or replace function public.calculate_investment_daily_return(p_amount numeric)
returns numeric
language plpgsql
immutable
as $$
begin
  if p_amount is null or p_amount <= 0 then
    return 0;
  end if;

  return round(round(p_amount) * (1850.0 / 15000.0));
end;
$$;

grant execute on function public.calculate_investment_daily_return(numeric) to authenticated;
grant execute on function public.calculate_investment_daily_return(numeric) to service_role;
grant execute on function public.calculate_investment_daily_return(numeric) to anon;

update public.farm_projects
set daily_return = public.calculate_investment_daily_return(min_amount),
    expected_return_pct = round(
      (public.calculate_investment_daily_return(min_amount) * duration_months * 30.0 /
        nullif(min_amount, 0)) * 100.0,
      2
    );

update public.investments i
set daily_return = public.calculate_investment_daily_return(i.amount),
    expected_return = round(
      public.calculate_investment_daily_return(i.amount) *
        greatest(1, round(coalesce(p.duration_months, 12)::numeric * 30))::int,
      2
    )
from public.farm_projects p
where p.id = i.farm_id
  and i.status = 'active';

select public.sync_investment_return_accruals();