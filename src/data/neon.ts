import { createClient } from "@neondatabase/neon-js";
import { createAuthClient } from "@neondatabase/neon-js/auth";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";

export type SchemaName = string;

const placeholderBranchId = "ep-your-branch-id";

function readEnv(name: keyof ImportMetaEnv) {
  return import.meta.env[name]?.trim();
}

function isValidHttpUrl(value: string | undefined) {
  return Boolean(
    value &&
      !value.includes(placeholderBranchId) &&
      URL.canParse(value) &&
      new URL(value).protocol.startsWith("http"),
  );
}

export const neonConfig = {
  authUrl: readEnv("VITE_NEON_AUTH_URL"),
  dataApiUrl: readEnv("VITE_NEON_DATA_API_URL"),
  appSchema: readEnv("VITE_NEON_APP_SCHEMA") || "mqs",
};

export const configStatus = {
  hasAuthConfig: isValidHttpUrl(neonConfig.authUrl),
  hasDataApiConfig: isValidHttpUrl(neonConfig.dataApiUrl),
};

export const hasAuthConfig = configStatus.hasAuthConfig;
export const hasAppConfig =
  configStatus.hasAuthConfig && configStatus.hasDataApiConfig;

export const appSchema: SchemaName = neonConfig.appSchema;

export function warnForMissingNeonConfig() {
  if (!configStatus.hasAuthConfig) {
    console.warn(
      "Missing or invalid VITE_NEON_AUTH_URL. Copy .env.example to .env.local and use your Neon Auth URL from the Neon Console.",
    );
  }

  if (!configStatus.hasDataApiConfig) {
    console.warn(
      "Missing or invalid VITE_NEON_DATA_API_URL. Use your Neon Data API URL from the Neon Console.",
    );
  }
}

const schemaClients = new Map<SchemaName, ReturnType<typeof createClient>>();

export function getSchemaClient(schema: SchemaName) {
  const existingClient = schemaClients.get(schema);

  if (existingClient) {
    return existingClient;
  }

  const client = createClient({
    auth: {
      adapter: BetterAuthReactAdapter(),
      url: neonConfig.authUrl ?? "",
    },
    dataApi: {
      url: neonConfig.dataApiUrl ?? "",
      options: {
        db: { schema: schema as "public" },
      },
    },
  });

  schemaClients.set(schema, client);
  return client;
}

export function getAppClient() {
  return getSchemaClient(appSchema);
}

export const neonClient = createClient({
  auth: {
    adapter: BetterAuthReactAdapter(),
    url: neonConfig.authUrl ?? "",
  },
  dataApi: {
    url: neonConfig.dataApiUrl ?? "",
  },
});

export const authClient = createAuthClient(neonConfig.authUrl ?? "", {
  adapter: BetterAuthReactAdapter(),
});
