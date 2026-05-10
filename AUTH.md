# Authentication

This frontend uses Neon Auth for username/password authentication and Neon Data API for admin CRUD pages. It is static-hostable: the browser talks directly to the configured Neon hosts.

## Required Configuration

Local development needs `.env.local` with:

```env
VITE_NEON_AUTH_URL=https://ep-your-branch-id.neonauth.us-east-1.aws.neon.tech/neondb/auth
VITE_NEON_DATA_API_URL=https://ep-your-branch-id.apirest.us-east-1.aws.neon.tech/neondb/rest/v1
VITE_NEON_SCHEMAS=mqs,wartaqi,public,auth,neon_auth
VITE_ADMIN_EMAILS=admin@example.com
```

Production deployment through GitHub Pages needs repository variables named `VITE_NEON_AUTH_URL`, `VITE_NEON_DATA_API_URL`, and `VITE_ADMIN_EMAILS`.

## Auth Flow

- [src/auth/client.ts](src/auth/client.ts) validates the Neon Auth URL, Data API URL, and admin allowlist before the app renders.
- [src/App.tsx](src/App.tsx) wraps the app with `NeonAuthUIProvider` and `AuthProvider`.
- [src/auth/AuthContext.tsx](src/auth/AuthContext.tsx) centralizes session reads, sign-out, normalized display fields, and the derived `isAdmin` flag.
- [src/components/AuthPanel.tsx](src/components/AuthPanel.tsx) shows the sign-in/sign-up UI to signed-out users and the admin workspace to allowlisted signed-in users.
- [src/components/CrudDashboard.tsx](src/components/CrudDashboard.tsx) reads and writes CRUD rows through Neon Data API using the selected schema.

## Security Notes

- `VITE_ADMIN_EMAILS` gates the frontend admin workspace, but database Row-Level Security remains the final access-control boundary.
- Do not commit `.env.local`, direct Postgres connection strings, CSV exports, or generated SQL seeds that contain student data.
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
