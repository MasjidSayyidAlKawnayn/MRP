import { createAuthClient } from "@neondatabase/neon-js/auth";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";

const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
const isValidAuthUrl = Boolean(
  authUrl &&
    !authUrl.includes("ep-your-branch-id") &&
    URL.canParse(authUrl) &&
    new URL(authUrl).protocol.startsWith("http"),
);

if (!isValidAuthUrl) {
  console.warn(
    "Missing or invalid VITE_NEON_AUTH_URL. Copy .env.example to .env.local and use your Neon Auth URL from the Neon Console.",
  );
}

export const hasAuthConfig = isValidAuthUrl;

export const authClient = createAuthClient(authUrl ?? "", {
  adapter: BetterAuthReactAdapter(),
});
