begin;

create table if not exists public.user_onboarding_state (
  user_id text primary key,
  version integer not null default 1,
  completed_item_ids text[] not null default '{}',
  dismissed_tour_ids text[] not null default '{}',
  dismissed_checklist_phases text[] not null default '{}',
  first_seen_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.user_onboarding_state
  add column if not exists version integer not null default 1,
  add column if not exists completed_item_ids text[] not null default '{}',
  add column if not exists dismissed_tour_ids text[] not null default '{}',
  add column if not exists dismissed_checklist_phases text[] not null default '{}',
  add column if not exists first_seen_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.user_onboarding_state enable row level security;
alter table public.user_onboarding_state no force row level security;

grant usage on schema public to authenticated;
revoke all on public.user_onboarding_state from anonymous;
revoke all on public.user_onboarding_state from authenticated;
grant select, insert, update, delete on public.user_onboarding_state to authenticated;

drop policy if exists user_onboarding_select_own on public.user_onboarding_state;
drop policy if exists user_onboarding_insert_own on public.user_onboarding_state;
drop policy if exists user_onboarding_update_own on public.user_onboarding_state;
drop policy if exists user_onboarding_delete_own on public.user_onboarding_state;

create policy user_onboarding_select_own on public.user_onboarding_state
  for select to authenticated
  using (
    user_id = coalesce(
      auth.user_id(),
      auth.uid()::text,
      auth.jwt() ->> 'sub'
    )
  );

create policy user_onboarding_insert_own on public.user_onboarding_state
  for insert to authenticated
  with check (
    user_id = coalesce(
      auth.user_id(),
      auth.uid()::text,
      auth.jwt() ->> 'sub'
    )
  );

create policy user_onboarding_update_own on public.user_onboarding_state
  for update to authenticated
  using (
    user_id = coalesce(
      auth.user_id(),
      auth.uid()::text,
      auth.jwt() ->> 'sub'
    )
  )
  with check (
    user_id = coalesce(
      auth.user_id(),
      auth.uid()::text,
      auth.jwt() ->> 'sub'
    )
  );

create policy user_onboarding_delete_own on public.user_onboarding_state
  for delete to authenticated
  using (
    user_id = coalesce(
      auth.user_id(),
      auth.uid()::text,
      auth.jwt() ->> 'sub'
    )
  );

commit;
