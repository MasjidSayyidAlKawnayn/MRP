import { describe, expect, it } from "vitest";
import { appSchema } from "./crud/data";
import { dashboardPath, decodeDraft, encodeDraft, getDefaultEntityKey } from "./routing";
import { router } from "./router";

describe("routing helpers", () => {
  it("builds attendance subpage path", () => {
    const path = dashboardPath({
      courseSlug: "default",
      entity: "attendanceRecords",
      subpage: "take",
    });

    expect(path).toBe("/courses/default/dashboard/attendanceRecords/take");
  });

  it("builds dashboard student and points paths", () => {
    expect(
      dashboardPath({
        courseSlug: "default",
        entity: "students",
      }),
    ).toBe("/courses/default/dashboard/students");

    expect(
      dashboardPath({
        courseSlug: "default",
        entity: "points",
        subpage: "manual",
      }),
    ).toBe("/courses/default/dashboard/points/manual");
  });

  it("keeps standardized routes and drops the legacy dashboard route", () => {
    const routesByPath = Object.keys(router.routesByPath);

    expect(routesByPath).toContain("/courses/$courseSlug/dashboard/$entity");
    expect(routesByPath).toContain("/courses/$courseSlug/dashboard/attendanceRecords/take");
    expect(routesByPath).toContain("/courses/$courseSlug/dashboard/points/manual");
    expect(routesByPath).not.toContain("/dashboard/$schema/$entity");
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
