create table if not exists public.allowed_users (
  email text primary key check (email = lower(email)),
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists public.directory_year_data (
  fiscal_year text primary key,
  records jsonb not null default '[]'::jsonb check (jsonb_typeof(records) = 'array'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists directory_year_data_updated_by_idx on public.directory_year_data(updated_by);

alter table public.allowed_users enable row level security;
alter table public.directory_year_data enable row level security;

revoke all on public.allowed_users from anon, authenticated;
grant select on public.allowed_users to authenticated;
revoke all on public.directory_year_data from anon, authenticated;
grant select, insert, update, delete on public.directory_year_data to authenticated;

drop policy if exists "users can view their own allowlist entry" on public.allowed_users;
create policy "users can view their own allowlist entry"
on public.allowed_users for select to authenticated
using (lower(email) = lower(((select auth.jwt()) ->> 'email')));

drop policy if exists "allowlisted users can read directory years" on public.directory_year_data;
create policy "allowlisted users can read directory years"
on public.directory_year_data for select to authenticated
using (exists (select 1 from public.allowed_users au where lower(au.email) = lower(((select auth.jwt()) ->> 'email'))));

drop policy if exists "allowlisted users can create directory years" on public.directory_year_data;
create policy "allowlisted users can create directory years"
on public.directory_year_data for insert to authenticated
with check (exists (select 1 from public.allowed_users au where lower(au.email) = lower(((select auth.jwt()) ->> 'email'))));

drop policy if exists "allowlisted users can update directory years" on public.directory_year_data;
create policy "allowlisted users can update directory years"
on public.directory_year_data for update to authenticated
using (exists (select 1 from public.allowed_users au where lower(au.email) = lower(((select auth.jwt()) ->> 'email'))))
with check (exists (select 1 from public.allowed_users au where lower(au.email) = lower(((select auth.jwt()) ->> 'email'))));

drop policy if exists "allowlisted users can delete directory years" on public.directory_year_data;
create policy "allowlisted users can delete directory years"
on public.directory_year_data for delete to authenticated
using (exists (select 1 from public.allowed_users au where lower(au.email) = lower(((select auth.jwt()) ->> 'email'))));
