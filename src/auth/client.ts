import { createAuthClient } from "@neondatabase/neon-js/auth";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";

const authUrl = import.meta.env.VITE_NEON_AUTH_URL;

if (!authUrl) {
  console.warn(
    "Missing VITE_NEON_AUTH_URL. Copy .env.example to .env.local and use your Neon Auth branch URL.",
  );
}

export const authClient = createAuthClient(authUrl ?? "", {
  adapter: BetterAuthReactAdapter(),
});
