# MRP Frontend

Vite, React, TypeScript, and Tailwind frontend for MRP. This repository is static-hostable on GitHub Pages and connects directly to Neon Auth for username/password authentication.

## Setup

```bash
bun install
cp .env.example .env.local
bun run dev
```

Set `VITE_NEON_AUTH_URL` to the Neon Auth URL for the branch you want this frontend to use.

```env
VITE_NEON_AUTH_URL=https://ep-your-branch-id.neonauth.us-east-1.aws.neon.tech/neondb/auth
```

This value must be the Auth URL from the Neon Console. If it is missing, the app will show a configuration error instead of trying to call a relative `/api/auth/*` route.

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

In the GitHub repository settings, enable GitHub Pages from GitHub Actions and add a repository variable named exactly `VITE_NEON_AUTH_URL`. The value must be the Auth URL from the Neon Console for the Neon branch this deployed frontend should use:

```text
VITE_NEON_AUTH_URL=https://ep-your-branch-id.neonauth.us-east-1.aws.neon.tech/neondb/auth
```

The deployed app is fully static and calls the Neon Auth host directly for username/password sign-in and sign-up. It does not define or need GitHub Pages API routes such as `/api/auth/get-session`.

Before production deployment, add the GitHub Pages origin to the trusted origins or domains in your Neon Auth branch settings. For a repository named `MRP-frontend`, the origin usually looks like:

```text
https://<github-user-or-org>.github.io
```

The app path will be `/MRP-frontend/`, but the trusted origin is the scheme and host.
