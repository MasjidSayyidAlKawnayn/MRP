import { describe, expect, it, vi } from "vitest";
import { resolveAdminAccess } from "./adminAccess";

describe("resolveAdminAccess", () => {
  it("retries until a fresh session is authorized", async () => {
    const checkAccess = vi
      .fn()
      .mockResolvedValueOnce({ data: false, error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("Unauthorized") })
      .mockResolvedValueOnce({ data: true, error: null });
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(
      resolveAdminAccess(checkAccess, {
        delays: [0, 150, 400],
        wait,
      }),
    ).resolves.toBe(true);
    expect(checkAccess).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });

  it("returns false after the bounded retry window", async () => {
    const checkAccess = vi.fn().mockResolvedValue({
      data: false,
      error: null,
    });

    await expect(
      resolveAdminAccess(checkAccess, {
        delays: [0, 1, 1],
        wait: async () => undefined,
      }),
    ).resolves.toBe(false);
    expect(checkAccess).toHaveBeenCalledTimes(3);
  });

  it("stops when the session check is cancelled", async () => {
    const checkAccess = vi.fn();

    await expect(
      resolveAdminAccess(checkAccess, {
        delays: [0],
        isCancelled: () => true,
      }),
    ).resolves.toBe(false);
    expect(checkAccess).not.toHaveBeenCalled();
  });
});
