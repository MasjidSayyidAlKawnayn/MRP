function isPostgrestError(error: unknown): error is { message?: string } {
  return Boolean(error && typeof error === "object" && "message" in error);
}

export function throwIfDataError(error: unknown) {
  if (error) {
    throw new Error(
      isPostgrestError(error) && error.message
        ? error.message
        : "The database request failed.",
    );
  }
}
