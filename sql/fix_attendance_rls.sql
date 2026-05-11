begin;

grant usage on schema mqs to authenticated;
revoke usage on schema mqs from anonymous;

grant select, insert, update, delete on mqs.attendance_sessions to authenticated;
grant select, insert, update, delete on mqs.attendance_records to authenticated;
revoke all on mqs.attendance_sessions from anonymous;
revoke all on mqs.attendance_records from anonymous;

grant usage, select on all sequences in schema mqs to authenticated;
revoke all on all sequences in schema mqs from anonymous;

alter table mqs.attendance_sessions enable row level security;
alter table mqs.attendance_sessions force row level security;
alter table mqs.attendance_records enable row level security;
alter table mqs.attendance_records force row level security;

drop policy if exists app_admin_select on mqs.attendance_sessions;
drop policy if exists app_admin_insert on mqs.attendance_sessions;
drop policy if exists app_admin_update on mqs.attendance_sessions;
drop policy if exists app_admin_delete on mqs.attendance_sessions;

create policy app_admin_select on mqs.attendance_sessions
  for select to authenticated
  using (public.is_app_admin());

create policy app_admin_insert on mqs.attendance_sessions
  for insert to authenticated
  with check (public.is_app_admin());

create policy app_admin_update on mqs.attendance_sessions
  for update to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy app_admin_delete on mqs.attendance_sessions
  for delete to authenticated
  using (public.is_app_admin());

drop policy if exists app_admin_select on mqs.attendance_records;
drop policy if exists app_admin_insert on mqs.attendance_records;
drop policy if exists app_admin_update on mqs.attendance_records;
drop policy if exists app_admin_delete on mqs.attendance_records;

create policy app_admin_select on mqs.attendance_records
  for select to authenticated
  using (public.is_app_admin());

create policy app_admin_insert on mqs.attendance_records
  for insert to authenticated
  with check (public.is_app_admin());

create policy app_admin_update on mqs.attendance_records
  for update to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy app_admin_delete on mqs.attendance_records
  for delete to authenticated
  using (public.is_app_admin());

notify pgrst, 'reload schema';

commit;
