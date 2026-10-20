-- Harden public data access without breaking read-only visitor access.
-- Works for existing deployments and for environments where legacy objects are absent.

do $migration$
begin
  if to_regclass('public.directory_year_data_public') is null then
    execute $view$
      create view public.directory_year_data_public as
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
      from public.directory_year_data d
    $view$;
  else
    execute $view$
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
      from public.directory_year_data d
    $view$;
  end if;
end
$migration$;

revoke all privileges on table public.directory_year_data_public from public, anon, authenticated;
grant select on table public.directory_year_data_public to anon, authenticated;

do $migration$
begin
  if to_regclass('public.chats') is not null then
    execute 'alter table public.chats enable row level security';
    execute 'revoke all privileges on table public.chats from public, anon, authenticated';
    execute 'drop policy if exists "Enable insert for all users" on public.chats';
    execute 'drop policy if exists "Enable read access for all users" on public.chats';
  end if;

  if to_regprocedure('public.get_m101_page_visit_stats()') is not null then
    execute 'revoke execute on function public.get_m101_page_visit_stats() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.get_public_directory_year_data()') is not null then
    execute 'revoke execute on function public.get_public_directory_year_data() from public, anon, authenticated';
  end if;
  if to_regprocedure('public.record_m101_page_visit(uuid)') is not null then
    execute 'revoke execute on function public.record_m101_page_visit(uuid) from public, anon, authenticated';
  end if;
end
$migration$;
