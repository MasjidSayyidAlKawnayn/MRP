import { describe, expect, it } from "vitest";
import { toDbPayload, trimCrudValue } from "./dataMappers";
import type { EntityDefinition } from "./entities";

const entity = {
  fields: [
    { column: "first_name", key: "firstName" },
    { column: "school_year", key: "schoolYear" },
    { column: "active", key: "active" },
    { column: "notes", key: "notes" },
  ],
} as EntityDefinition;

describe("trimCrudValue", () => {
  it("trims strings without changing non-string values", () => {
    expect(trimCrudValue("  محمود  ")).toBe("محمود");
    expect(trimCrudValue(2026)).toBe(2026);
    expect(trimCrudValue(false)).toBe(false);
    expect(trimCrudValue(null)).toBeNull();
  });
});

describe("toDbPayload", () => {
  it("trims every persisted string field", () => {
    expect(
      toDbPayload(entity, {
        active: true,
        firstName: "  ياسين وعثمان  ",
        notes: "   ",
        schoolYear: 4,
      }),
    ).toEqual({
      active: true,
      first_name: "ياسين وعثمان",
      notes: "",
      school_year: 4,
    });
  });
});
