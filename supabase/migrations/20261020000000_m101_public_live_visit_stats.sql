-- Public aggregate-only page statistics for M101.
-- Raw visit rows are never directly readable from browser clients.
create table if not exists public.m101_page_visits (
  visitor_id uuid not null,
  visit_date date not null default (timezone('utc', now())::date),
  first_seen timestamptz not null default now(),
  constraint m101_page_visits_pkey primary key (visitor_id, visit_date)
);

alter table public.m101_page_visits enable row level security;
revoke all on public.m101_page_visits from anon, authenticated;
grant usage on schema public to anon, authenticated;

create or replace function public.record_m101_page_visit(p_visitor_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_visitor_id is null then
    raise exception 'visitor id is required';
  end if;
  insert into public.m101_page_visits(visitor_id, visit_date)
  values (p_visitor_id, (pg_catalog.now() at time zone 'utc')::date)
  on conflict (visitor_id, visit_date) do nothing;
end;
$$;

revoke all on function public.record_m101_page_visit(uuid) from public;
grant execute on function public.record_m101_page_visit(uuid) to anon, authenticated;

create or replace function public.get_m101_page_visit_stats()
returns table(today_count bigint, total_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    count(*) filter (where v.visit_date = (pg_catalog.now() at time zone 'utc')::date),
    count(*)
  from public.m101_page_visits v;
$$;

revoke all on function public.get_m101_page_visit_stats() from public;
grant execute on function public.get_m101_page_visit_stats() to anon, authenticated;
