import { describe, expect, it } from "vitest";
import { formatDate } from "./date";

describe("date utilities", () => {
  it("formats API date strings for UI display", () => {
    expect(formatDate("2026-08-17")).toContain("2026");
  });
});
