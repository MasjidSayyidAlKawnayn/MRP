import { describe, expect, it, vi } from "vitest";
import { getDateDaysAgoString, getTodayDateString } from "./date";

describe("date utils", () => {
  it("returns YYYY-MM-DD for today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-27T10:00:00Z"));
    expect(getTodayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    vi.useRealTimers();
  });

  it("returns previous date by day offset", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-27T10:00:00Z"));
    expect(getDateDaysAgoString(7)).toBe("2026-05-20");
    vi.useRealTimers();
  });
});
