import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  businessDateTimeToInstant,
  isPastBookingDateTime,
  isValidCalendarDate,
  todayDateString,
} from "../src/utils/time.js";

describe("business timezone utilities", () => {
  it("derives the business date from the configured timezone, not UTC", () => {
    const utcBoundary = new Date("2026-08-13T18:30:00.000Z");

    expect(todayDateString(utcBoundary, "Asia/Jakarta")).toBe("2026-08-14");
    expect(todayDateString(utcBoundary, "UTC")).toBe("2026-08-13");
  });

  it("compares booking local date and time in the business timezone", () => {
    const now = new Date("2026-08-13T18:30:00.000Z");

    expect(isPastBookingDateTime("2026-08-14", "01:00", now, "Asia/Jakarta")).toBe(true);
    expect(isPastBookingDateTime("2026-08-14", "02:00", now, "Asia/Jakarta")).toBe(false);
    expect(businessDateTimeToInstant("2026-08-14", "01:30", "Asia/Jakarta")?.toISOString()).toBe(
      "2026-08-13T18:30:00.000Z",
    );
  });

  it("rejects impossible calendar dates", () => {
    expect(isValidCalendarDate("2026-02-31")).toBe(false);
    expect(isValidCalendarDate("2026-02-29")).toBe(false);
    expect(isValidCalendarDate("2028-02-29")).toBe(true);
    expect(isValidCalendarDate("2026-04-31")).toBe(false);
    expect(businessDateTimeToInstant("2026-02-31", "10:00", "Asia/Jakarta")).toBeNull();
    expect(() => addBusinessDays("2026-02-31", 1)).toThrow("Invalid date value.");
  });
});
