import { describe, expect, it } from "vitest";
import { businessDateTimeToInstant, isPastBookingDateTime, todayDateString } from "../src/utils/time.js";

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
});
