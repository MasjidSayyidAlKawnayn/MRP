begin;

create table if not exists public.app_admins (
  user_id text primary key,
  email text unique,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
alter table public.app_admins force row level security;

revoke all on public.app_admins from anonymous;
revoke all on public.app_admins from authenticated;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = auth.user_id()::text
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

do $$
declare
  app_schema text;
  app_table text;
begin
  foreach app_schema in array array['mqs', 'wartaqi']
  loop
    execute format('grant usage on schema %I to authenticated', app_schema);
    execute format('revoke usage on schema %I from anonymous', app_schema);

    for app_table in
      select table_name
      from information_schema.tables
      where table_schema = app_schema
        and table_type = 'BASE TABLE'
    loop
      execute format('alter table %I.%I enable row level security', app_schema, app_table);
      execute format('alter table %I.%I force row level security', app_schema, app_table);
      execute format('revoke all on %I.%I from anonymous', app_schema, app_table);
      execute format('grant select, insert, update, delete on %I.%I to authenticated', app_schema, app_table);

      execute format('drop policy if exists app_admin_select on %I.%I', app_schema, app_table);
      execute format('drop policy if exists app_admin_insert on %I.%I', app_schema, app_table);
      execute format('drop policy if exists app_admin_update on %I.%I', app_schema, app_table);
      execute format('drop policy if exists app_admin_delete on %I.%I', app_schema, app_table);

      execute format(
        'create policy app_admin_select on %I.%I for select to authenticated using (public.is_app_admin())',
        app_schema,
        app_table
      );
      execute format(
        'create policy app_admin_insert on %I.%I for insert to authenticated with check (public.is_app_admin())',
        app_schema,
        app_table
      );
      execute format(
        'create policy app_admin_update on %I.%I for update to authenticated using (public.is_app_admin()) with check (public.is_app_admin())',
        app_schema,
        app_table
      );
      execute format(
        'create policy app_admin_delete on %I.%I for delete to authenticated using (public.is_app_admin())',
        app_schema,
        app_table
      );
    end loop;

    execute format('grant usage, select on all sequences in schema %I to authenticated', app_schema);
    execute format('revoke all on all sequences in schema %I from anonymous', app_schema);
  end loop;
end $$;

commit;

-- After running this migration as a database owner, add admins by Neon Auth user ID:
-- insert into public.app_admins (user_id, email)
-- values ('replace-with-neon-auth-user-id', 'admin@example.com')
-- on conflict (user_id) do update set email = excluded.email;
