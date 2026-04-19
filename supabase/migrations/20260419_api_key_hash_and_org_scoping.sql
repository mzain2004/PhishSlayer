create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists api_key_last4 text;

alter table public.ctem_exposures
  add column if not exists organization_id uuid references public.organizations(id);

alter table public.static_analysis
  add column if not exists organization_id uuid references public.organizations(id);

alter table public.agent_reasoning
  add column if not exists organization_id uuid references public.organizations(id);

alter table public.sigma_rules
  add column if not exists organization_id uuid references public.organizations(id);

create index if not exists idx_profiles_api_key_last4
  on public.profiles(api_key_last4);

create index if not exists idx_ctem_exposures_org_id
  on public.ctem_exposures(organization_id);

create index if not exists idx_static_analysis_org_id
  on public.static_analysis(organization_id);

create index if not exists idx_agent_reasoning_org_id
  on public.agent_reasoning(organization_id);

create index if not exists idx_sigma_rules_org_id
  on public.sigma_rules(organization_id);

create unique index if not exists uniq_ctem_exposures_org_asset
  on public.ctem_exposures(organization_id, asset_name, exposure_type);

update public.profiles
set api_key_last4 = right(api_key, 4)
where api_key is not null
  and api_key_last4 is null
  and api_key not like '$2%';

update public.profiles
set api_key = crypt(api_key, gen_salt('bf'))
where api_key is not null
  and api_key not like '$2%';

create or replace function public.consume_api_call(
  p_user_id uuid,
  p_limit integer
)
returns table (
  allowed boolean,
  api_calls_today integer,
  reset_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_calls integer;
  v_reset timestamptz;
  v_today date := (now() at time zone 'utc')::date;
begin
  select api_calls_today, api_calls_reset_at
    into v_calls, v_reset
  from public.profiles
  where id = p_user_id
  for update;

  if v_reset is null or v_reset::date <> v_today then
    v_calls := 0;
    v_reset := now();
    update public.profiles
      set api_calls_today = 0,
          api_calls_reset_at = v_reset
    where id = p_user_id;
  end if;

  if p_limit >= 0 and v_calls >= p_limit then
    return query select false, v_calls, v_reset;
    return;
  end if;

  update public.profiles
    set api_calls_today = v_calls + 1
  where id = p_user_id;

  return query select true, v_calls + 1, v_reset;
end;
$$;

revoke all on function public.consume_api_call(uuid, integer) from public;
