/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NEON_AUTH_URL?: string;
  readonly VITE_NEON_DATA_API_URL?: string;
  readonly VITE_NEON_SCHEMAS?: string;
  readonly VITE_ADMIN_EMAILS?: string;
  readonly VITE_BASE_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
