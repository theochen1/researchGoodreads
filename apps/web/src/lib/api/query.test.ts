import { describe, expect, it } from "vitest";
import { parseBoundedLimit } from "./query";

describe("parseBoundedLimit", () => {
  const options = { defaultLimit: 30, maxLimit: 100 };

  it("uses the default for missing or invalid values", () => {
    expect(parseBoundedLimit(null, options)).toBe(30);
    expect(parseBoundedLimit("not-a-number", options)).toBe(30);
    expect(parseBoundedLimit("0", options)).toBe(30);
    expect(parseBoundedLimit("-5", options)).toBe(30);
  });

  it("floors valid values and caps them at the maximum", () => {
    expect(parseBoundedLimit("12.9", options)).toBe(12);
    expect(parseBoundedLimit("500", options)).toBe(100);
  });
});
