import { describe, expect, it } from "vitest";
import { normalizeSearchText, searchRows } from "./search";

describe("normalizeSearchText", () => {
  it("normalizes arabic variants and spaces", () => {
    expect(normalizeSearchText("  \u0623\u064E\u062D\u0652\u0645\u064E\u062F   ")).toBe("\u0627\u062D\u0645\u062F");
  });
});

describe("searchRows", () => {
  const rows = [
    { id: 1, name: "\u0623\u062D\u0645\u062F \u0639\u0644\u064A" },
    { id: 2, name: "\u0632\u064A\u0646\u0628" },
  ];

  it("matches normalized text", () => {
    const filtered = searchRows(rows, "\u0627\u062D\u0645\u062F", (row) => row.name as string);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe(1);
  });

  it("matches fuzzy typos", () => {
    const filtered = searchRows(rows, "\u0627\u062D\u0645\u0630", (row) => row.name as string);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe(1);
  });
});
