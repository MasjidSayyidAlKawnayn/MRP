import { describe, expect, it } from "vitest";
import {
  buildGoogleContactsCsv,
  normalizeContactPhone,
} from "./googleContacts";

describe("normalizeContactPhone", () => {
  it("normalizes Syrian local and international numbers", () => {
    expect(normalizeContactPhone("0964 591 314")).toBe("+963964591314");
    expect(normalizeContactPhone("+963 980 227 287")).toBe("+963980227287");
    expect(normalizeContactPhone("00963 935 744 809")).toBe("+963935744809");
  });
});

describe("buildGoogleContactsCsv", () => {
  it("uses family prefixes, preserves Arabic, and combines shared numbers", () => {
    const csv = buildGoogleContactsCsv(
      [
        {
          firstName: "عبد الرحمن",
          lastName: "الألشي",
          phone: "0964591314",
        },
        {
          firstName: "عمر",
          lastName: "الساعاتي",
          fatherPhone: "0964591314",
        },
      ],
      [
        {
          firstName: "وسيم",
          lastName: "الصفدي",
          phoneNumber: "0968968519",
        },
      ],
    );

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(
      '"أهل عبد الرحمن الألشي / أهل عمر الساعاتي","Mobile","+963964591314"',
    );
    expect(csv).toContain(
      '"الأستاذ وسيم الصفدي","Mobile","+963968968519"',
    );
    expect(csv).not.toContain("????");
  });

  it("deduplicates repeated phone fields for the same student", () => {
    const csv = buildGoogleContactsCsv(
      [
        {
          firstName: "ليث",
          lastName: "الحايك",
          phone: "0980227287",
          primaryParentPhone: "0980227287",
        },
      ],
      [],
    );

    expect(csv.match(/\+963980227287/g)).toHaveLength(1);
  });
});
