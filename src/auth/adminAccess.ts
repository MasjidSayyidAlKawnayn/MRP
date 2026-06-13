export interface AdminAccessResponse {
  data: unknown;
  error: unknown;
}

interface AdminAccessOptions {
  delays?: number[];
  isCancelled?: () => boolean;
  wait?: (delay: number) => Promise<void>;
}

function getRpcBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return getRpcBoolean(value[0]);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return getRpcBoolean(record.is_app_admin ?? record.result);
  }

  return false;
}

function waitFor(delay: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, delay);
  });
}

export async function resolveAdminAccess(
  checkAccess: () => Promise<AdminAccessResponse>,
  {
    delays = [0, 150, 400, 800],
    isCancelled = () => false,
    wait = waitFor,
  }: AdminAccessOptions = {},
) {
  for (const delay of delays) {
    if (delay > 0) {
      await wait(delay);
    }

    if (isCancelled()) {
      return false;
    }

    try {
      const response = await checkAccess();

      if (!response.error && getRpcBoolean(response.data)) {
        return true;
      }
    } catch {
      // A freshly established auth session may not have reached the data client yet.
    }
  }

  return false;
}
