import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDate, isFutureDate, todayInputValue } from "./date";

afterEach(() => {
  vi.useRealTimers();
});

describe("date utilities", () => {
  it("formats API date strings for UI display", () => {
    expect(formatDate("2026-08-17")).toContain("2026");
  });

  it("uses the business timezone for today and future comparisons", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T18:30:00.000Z"));

    expect(todayInputValue()).toBe("2026-08-14");
    expect(isFutureDate("2026-08-15")).toBe(true);
    expect(isFutureDate("2026-08-13")).toBe(false);
  });
});
