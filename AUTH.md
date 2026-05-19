# Authentication

This frontend uses Neon Auth for username/password authentication and Neon Data API for admin CRUD pages. It is static-hostable: the browser talks directly to the configured Neon hosts.

## Required Configuration

Local development needs `.env.local` with:

```env
VITE_NEON_AUTH_URL=https://ep-your-branch-id.neonauth.us-east-1.aws.neon.tech/neondb/auth
VITE_NEON_DATA_API_URL=https://ep-your-branch-id.apirest.us-east-1.aws.neon.tech/neondb/rest/v1
VITE_NEON_APP_SCHEMA=mqs
```

Production deployment through GitHub Pages needs repository variables named `VITE_NEON_AUTH_URL` and `VITE_NEON_DATA_API_URL`.

## Database Authorization

This app is static, so every `VITE_*` value is visible to anyone who loads the site. Secure CRUD access in the database, not in React.

Run [sql/secure_admin_rls.sql](sql/secure_admin_rls.sql) as a database owner before exposing the deployed CRUD UI. The migration:

- creates `public.app_admins`
- adds an `owner` permission flag to `public.app_admins`
- enables and forces RLS on app-schema tables
- grants Data API access only to the `authenticated` role
- creates policies that allow app CRUD only when `public.is_app_admin()` matches the signed-in Neon Auth user ID
- creates policies that allow only owners to manage users and permissions in `public.app_admins`

After the migration, insert the first owner's Neon Auth user ID:

```sql
insert into public.app_admins (user_id, email, owner)
values ('replace-with-neon-auth-user-id', 'owner@example.com', true)
on conflict (user_id) do update set email = excluded.email, owner = true;
```

## Auth Flow

- [src/auth/client.ts](src/auth/client.ts) validates the Neon Auth URL, Data API URL, and admin allowlist before the app renders.
- [src/App.tsx](src/App.tsx) wraps the app with `NeonAuthUIProvider` and `AuthProvider`.
- [src/auth/AuthContext.tsx](src/auth/AuthContext.tsx) centralizes session reads, sign-out, normalized display fields, and the signed-in workspace flag.
- [src/components/AuthPanel.tsx](src/components/AuthPanel.tsx) shows the sign-in/sign-up UI to signed-out users and the admin workspace to signed-in users. Database RLS decides which requests succeed.
- [src/components/CrudDashboard.tsx](src/components/CrudDashboard.tsx) reads and writes CRUD rows through Neon Data API using the active course.

## Security Notes

- Admin rows in `public.app_admins` can access app data. Rows with `owner = true` can also manage users and permissions.
- Database Row-Level Security is the required access-control boundary for every Data API request.
- Do not commit `.env.local`, direct Postgres connection strings, CSV exports, or generated SQL seeds that contain student data.
- Do not expose `public`, `auth`, `neon_auth`, or other system schemas through frontend configuration. `VITE_NEON_APP_SCHEMA` should normally stay `mqs`.
- Do not store passwords or raw login form input in React context.
- Keep token-sensitive usage centralized in the auth layer if future API helpers need direct token access.

## Using Auth State

Subcomponents should use the app-owned auth context:

```tsx
import { useAuth } from "../auth/AuthContext";

export function HeaderAccountBadge() {
  const { isAuthenticated, email, name } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return <span>{name || email}</span>;
}
```
