-- Harden public data access without breaking read-only visitor access.
-- The public view remains the only anonymous read path for directory data and masks sensitive keys.

create or replace view public.directory_year_data_public as
select
  d.fiscal_year,
  coalesce(
    (
      select jsonb_agg(
        (
          select jsonb_object_agg(
            entry.key,
            case
              when entry.key ~* '(password|passcode|efilingcode|sso(code)?|secret|token|pin|credential|api[_-]?key|private[_-]?key|access[_-]?key|client[_-]?secret|authorization|bearer|account[_-]?number)'
                then to_jsonb('********'::text)
              when entry.key ~* '^taxid$'
                then to_jsonb(left(trim(both '"' from entry.value::text), 4) || '*********')
              else entry.value
            end
          )
          from jsonb_each(item.value) entry(key, value)
        )
      )
      from jsonb_array_elements(d.records) item(value)
    ),
    '[]'::jsonb
  ) as records,
  d.updated_at
from public.directory_year_data d;

revoke all privileges on table public.directory_year_data_public from public, anon, authenticated;
grant select on table public.directory_year_data_public to anon, authenticated;

-- This table is unused by the application; remove accidental public write/read access.
alter table public.chats enable row level security;
revoke all privileges on table public.chats from public, anon, authenticated;
drop policy if exists "Enable insert for all users" on public.chats;
drop policy if exists "Enable read access for all users" on public.chats;

-- These RPCs are unused by the deployed application; they must not expose SECURITY DEFINER
-- entry points until they are redesigned with an explicit authorization contract.
revoke execute on function public.get_m101_page_visit_stats() from public, anon, authenticated;
revoke execute on function public.get_public_directory_year_data() from public, anon, authenticated;
revoke execute on function public.record_m101_page_visit(uuid) from public, anon, authenticated;
