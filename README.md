# MRP Frontend

Vite, React, TypeScript, and Tailwind frontend for MRP. This repository is static-hostable on GitHub Pages and connects directly to Neon Auth for username/password authentication.

## Setup

```bash
bun install
cp .env.example .env.local
bun run dev
```

Set `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL` for the branch you want this frontend to use. `VITE_ADMIN_EMAILS` is optional and only controls whether the browser UI shows the admin workspace; database Row-Level Security is the real authorization boundary.

```env
VITE_NEON_AUTH_URL=https://ep-your-branch-id.neonauth.us-east-1.aws.neon.tech/neondb/auth
VITE_NEON_DATA_API_URL=https://ep-your-branch-id.apirest.us-east-1.aws.neon.tech/neondb/rest/v1
VITE_ADMIN_EMAILS=admin@example.com
```

These values must come from the Neon Console and your admin allowlist. If any required value is missing, the app will show a configuration error instead of trying to call an invalid auth or data endpoint.

Before exposing CRUD pages, run [sql/secure_admin_rls.sql](sql/secure_admin_rls.sql) as a database owner and add each admin's Neon Auth user ID to `public.app_admins`. Do not rely on `VITE_ADMIN_EMAILS` for security.

## Auth

Authentication is documented in [AUTH.md](AUTH.md). The signed-in admin workspace uses Neon Auth for identity, Neon Data API for CRUD requests, and database RLS policies for final access control against the MQS and Wartaqi schemas.

## Scripts

```bash
bun run dev
bun run typecheck
bun run build
bun run preview
```

## GitHub Pages

The deployment workflow builds `dist` and publishes it with GitHub Pages. The workflow sets `VITE_BASE_PATH` from the repository name so Vite emits correct asset URLs for project pages.

In **Settings -> Pages -> Build and deployment**, set **Source** to **GitHub Actions**. Do not use **Deploy from a branch** with `main` and `/(root)`, because that serves the raw Vite source `index.html` and causes GitHub Pages to request `/src/main.tsx`.

In the GitHub repository settings, enable GitHub Pages from GitHub Actions and add repository variables named exactly `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL`. You can also add `VITE_ADMIN_EMAILS` and `VITE_NEON_SCHEMAS` as public UI configuration. The URL values must come from the Neon Console for the Neon branch this deployed frontend should use:

```text
VITE_NEON_AUTH_URL=https://ep-your-branch-id.neonauth.us-east-1.aws.neon.tech/neondb/auth
VITE_NEON_DATA_API_URL=https://ep-your-branch-id.apirest.us-east-1.aws.neon.tech/neondb/rest/v1
VITE_ADMIN_EMAILS=admin@example.com,second-admin@example.com
VITE_NEON_SCHEMAS=mqs,wartaqi
```

The deployed app is fully static and calls Neon Auth directly for username/password sign-in and sign-up. Admin CRUD pages call Neon Data API directly and depend on database Row-Level Security for final access control. `VITE_*` values are visible in the browser bundle, so they must never contain private tokens, passwords, or service-role credentials. The app does not define or need GitHub Pages API routes such as `/api/auth/get-session`.

Before production deployment, add the GitHub Pages origin to the trusted origins or domains in your Neon Auth branch settings. For a repository named `MRP-frontend`, the origin usually looks like:

```text
https://<github-user-or-org>.github.io
```

The app path will be `/MRP-frontend/`, but the trusted origin is the scheme and host.
