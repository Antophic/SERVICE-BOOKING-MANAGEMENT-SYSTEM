import { describe, expect, it } from "vitest";
import { currency } from "./format";

describe("currency formatter", () => {
  it("formats USD amounts without cents for the portfolio demo", () => {
    expect(currency.format(320)).toBe("$320");
  });
});
