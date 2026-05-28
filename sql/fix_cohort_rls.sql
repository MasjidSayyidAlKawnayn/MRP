-- Grants and RLS policies for cohort tables used by the dashboard.

grant usage on schema mqs to authenticated;

grant select, insert, update, delete on mqs.cohorts to authenticated;
grant select, insert, update, delete on mqs.cohort_enrollments to authenticated;
grant usage, select on all sequences in schema mqs to authenticated;

alter table mqs.cohorts enable row level security;
alter table mqs.cohort_enrollments enable row level security;

drop policy if exists app_admin_select on mqs.cohorts;
drop policy if exists app_admin_insert on mqs.cohorts;
drop policy if exists app_admin_update on mqs.cohorts;
drop policy if exists app_admin_delete on mqs.cohorts;

create policy app_admin_select on mqs.cohorts
  for select
  to authenticated
  using (public.is_app_admin());

create policy app_admin_insert on mqs.cohorts
  for insert
  to authenticated
  with check (public.is_app_admin());

create policy app_admin_update on mqs.cohorts
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy app_admin_delete on mqs.cohorts
  for delete
  to authenticated
  using (public.is_app_admin());

drop policy if exists app_admin_select on mqs.cohort_enrollments;
drop policy if exists app_admin_insert on mqs.cohort_enrollments;
drop policy if exists app_admin_update on mqs.cohort_enrollments;
drop policy if exists app_admin_delete on mqs.cohort_enrollments;

create policy app_admin_select on mqs.cohort_enrollments
  for select
  to authenticated
  using (public.is_app_admin());

create policy app_admin_insert on mqs.cohort_enrollments
  for insert
  to authenticated
  with check (public.is_app_admin());

create policy app_admin_update on mqs.cohort_enrollments
  for update
  to authenticated
  using (public.is_app_admin())
  with check (public.is_app_admin());

create policy app_admin_delete on mqs.cohort_enrollments
  for delete
  to authenticated
  using (public.is_app_admin());
