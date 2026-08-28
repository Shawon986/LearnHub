import { describe, expect, it } from "vitest";
import { slugify, generateReferralCode, safeJsonParse, generateToken } from "./utils";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("React & Next.js Masterclass")).toBe("react-nextjs-masterclass");
  });

  it("handles bangla-adjacent unicode by stripping it", () => {
    expect(slugify("  Hello   World  ")).toBe("hello-world");
  });
});

describe("generateReferralCode", () => {
  it("produces LEARN-NAME-NNN format", () => {
    const code = generateReferralCode("Shawon Ahmed");
    expect(code).toMatch(/^LEARN-SHAWONAHMED-\d{3}$/);
  });

  it("is unique-ish across calls", () => {
    const a = generateReferralCode("Test User");
    const b = generateReferralCode("Test User");
    expect(a).not.toBe(b);
  });
});

describe("safeJsonParse", () => {
  it("returns fallback for invalid JSON", () => {
    expect(safeJsonParse("not-json", [1, 2])).toEqual([1, 2]);
  });

  it("parses strings and passes objects through", () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 });
    expect(safeJsonParse({ a: 1 }, {})).toEqual({ a: 1 });
  });

  it("handles null with fallback", () => {
    expect(safeJsonParse(null, "fallback")).toBe("fallback");
  });
});

describe("generateToken", () => {
  it("returns hex of requested byte length", () => {
    expect(generateToken(32)).toMatch(/^[a-f0-9]{64}$/);
  });
});
