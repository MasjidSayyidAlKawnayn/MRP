import { createClient } from "@neondatabase/neon-js";
import { createAuthClient } from "@neondatabase/neon-js/auth";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";

const authUrl = import.meta.env.VITE_NEON_AUTH_URL;
const dataApiUrl = import.meta.env.VITE_NEON_DATA_API_URL;

const isValidAuthUrl = Boolean(
  authUrl &&
  !authUrl.includes("ep-your-branch-id") &&
  URL.canParse(authUrl) &&
  new URL(authUrl).protocol.startsWith("http"),
);
const isValidDataApiUrl = Boolean(
  dataApiUrl &&
  !dataApiUrl.includes("ep-your-branch-id") &&
  URL.canParse(dataApiUrl) &&
  new URL(dataApiUrl).protocol.startsWith("http"),
);

if (!isValidAuthUrl) {
  console.warn(
    "Missing or invalid VITE_NEON_AUTH_URL. Copy .env.example to .env.local and use your Neon Auth URL from the Neon Console.",
  );
}

if (!isValidDataApiUrl) {
  console.warn(
    "Missing or invalid VITE_NEON_DATA_API_URL. Use your Neon Data API URL from the Neon Console.",
  );
}

export const configStatus = {
  hasAuthConfig: isValidAuthUrl,
  hasDataApiConfig: isValidDataApiUrl,
};

export const hasAuthConfig = configStatus.hasAuthConfig;
export const hasAppConfig =
  configStatus.hasAuthConfig && configStatus.hasDataApiConfig;

export const neonClient = createClient({
  auth: {
    adapter: BetterAuthReactAdapter(),
    url: authUrl ?? "",
  },
  dataApi: {
    url: dataApiUrl ?? "",
  },
});

export const authClient = createAuthClient(authUrl ?? "", {
  adapter: BetterAuthReactAdapter(),
});
