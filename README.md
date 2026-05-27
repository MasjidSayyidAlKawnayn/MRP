# MRP Frontend

Vite, React, TypeScript, and Tailwind frontend for MRP. This repository is static-hostable on GitHub Pages and connects directly to Neon Auth for username/password authentication.

## Setup

```bash
bun install
cp .env.example .env.local
bun run dev
```

Set `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL` for the branch you want this frontend to use. Database Row-Level Security is the authorization boundary. Course isolation is handled by a shared `course_id` column in the app schema.

```env
VITE_NEON_AUTH_URL=https://ep-your-branch-id.neonauth.us-east-1.aws.neon.tech/neondb/auth
VITE_NEON_DATA_API_URL=https://ep-your-branch-id.apirest.us-east-1.aws.neon.tech/neondb/rest/v1
VITE_NEON_APP_SCHEMA=mqs
```

These values must come from the Neon Console and your admin allowlist. If any required value is missing, the app will show a configuration error instead of trying to call an invalid auth or data endpoint.

Before exposing CRUD pages, run [sql/course_isolation.sql](sql/course_isolation.sql) and [sql/secure_admin_rls.sql](sql/secure_admin_rls.sql) as a database owner, then add the first owner by Neon Auth user ID to `public.app_admins`. Owners can manage other admins and owners from the settings page.

## Auth

Authentication is documented in [AUTH.md](AUTH.md). The signed-in admin workspace uses Neon Auth for identity, Neon Data API for CRUD requests, and database RLS policies for final access control against the app schema. Each course has isolated students, teachers, groups, assignments, memorization, points, and attendance rows.

## Scripts

```bash
bun run dev
bun run db:migrate
bun run typecheck
bun run build
bun run preview
```

## Data layer

Runtime Neon configuration and client setup live in `src/data/neon.ts`. CRUD table metadata lives in `src/crud/entities.ts`, while database operations are split into focused repository modules under `src/crud/`. See `src/data/README.md` before adding a new table or changing schema behavior.

Run database migrations against a Neon branch with an owner `DATABASE_URL`:

```powershell
$env:DATABASE_URL='postgresql://...'
npm run db:migrate
```

Migration order and one-off commands are documented in `sql/README.md`.

Attendance CSV imports must target a course:

```powershell
$env:COURSE_SLUG='default'; bun run generate:attendance-sql
$env:COURSE_SLUG='default'; bun run seed:attendance
```

## GitHub Pages

The deployment workflow builds `dist` and publishes it with GitHub Pages. The workflow sets `VITE_BASE_PATH` from the repository name so Vite emits correct asset URLs for project pages.

In **Settings -> Pages -> Build and deployment**, set **Source** to **GitHub Actions**. Do not use **Deploy from a branch** with `main` and `/(root)`, because that serves the raw Vite source `index.html` and causes GitHub Pages to request `/src/main.tsx`.

In the GitHub repository settings, enable GitHub Pages from GitHub Actions and add repository variables named exactly `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL`. You can also add `VITE_NEON_APP_SCHEMA` as public UI configuration. The URL values must come from the Neon Console for the Neon branch this deployed frontend should use:

```text
VITE_NEON_AUTH_URL=https://ep-your-branch-id.neonauth.us-east-1.aws.neon.tech/neondb/auth
VITE_NEON_DATA_API_URL=https://ep-your-branch-id.apirest.us-east-1.aws.neon.tech/neondb/rest/v1
VITE_NEON_APP_SCHEMA=mqs
```

The deployed app is fully static and calls Neon Auth directly for username/password sign-in and sign-up. Admin CRUD pages call Neon Data API directly and depend on database Row-Level Security for final access control. `VITE_*` values are visible in the browser bundle, so they must never contain private tokens, passwords, or service-role credentials. The app does not define or need GitHub Pages API routes such as `/api/auth/get-session`.

Before production deployment, add the GitHub Pages origin to the trusted origins or domains in your Neon Auth branch settings. For a repository named `MRP-frontend`, the origin usually looks like:

```text
https://<github-user-or-org>.github.io
```

The app path will be `/MRP-frontend/`, but the trusted origin is the scheme and host.
