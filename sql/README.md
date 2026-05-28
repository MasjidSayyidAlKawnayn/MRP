# Neon database migrations

Run these SQL files against the Neon branch you want this frontend to use. They are written to be repeatable with `create if not exists`, `alter ... add column if not exists`, and policy replacement where practical.

## Environment

Use a database owner connection string. Do not expose `DATABASE_URL` to the Vite app or GitHub Pages.

```powershell
$env:DATABASE_URL='postgresql://...'
npm run db:migrate
```

Run one file when needed:

```powershell
npm run db:migrate -- --only secure_admin_rls.sql
```

## Order

1. `course_isolation.sql`
2. `cohort_cycles.sql`
3. `group_color_codes.sql`
4. `points_and_page_tracking.sql`
5. `fix_attendance_rls.sql`
6. `fix_cohort_rls.sql`
7. `secure_admin_rls.sql`
8. `user_onboarding_state.sql`

After the first admin signs up through Neon Auth, insert their Neon Auth user ID into `public.app_admins` with `owner = true` from a trusted database session.

Attendance imports are separate because they depend on a target course and generated CSV SQL:

```powershell
$env:COURSE_SLUG='default'
npm run generate:attendance-sql
npm run seed:attendance
```
