import { describe, expect, it } from "vitest";
import { appSchema } from "./crud/data";
import { dashboardPath, decodeDraft, encodeDraft, getDefaultEntityKey } from "./routing";

describe("routing helpers", () => {
  it("builds attendance subpage path", () => {
    const path = dashboardPath({
      courseSlug: "default",
      entity: "attendanceRecords",
      subpage: "take",
    });

    expect(path).toBe("/courses/default/dashboard/attendanceRecords/take");
  });

  it("encodes and decodes draft payload", () => {
    const payload = { firstName: "Anas", score: 10 };
    const encoded = encodeDraft(payload);
    expect(decodeDraft(encoded)).toEqual(payload);
  });

  it("returns first entity as default", () => {
    expect(typeof getDefaultEntityKey(appSchema)).toBe("string");
  });
});
