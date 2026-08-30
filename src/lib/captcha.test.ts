import { describe, expect, it } from "vitest";
import { createCaptchaChallenge, verifyCaptcha } from "./captcha";

describe("captcha", () => {
  it("accepts the correct answer", () => {
    const ch = createCaptchaChallenge();
    expect(ch.a).toBeGreaterThanOrEqual(1);
    expect(ch.b).toBeGreaterThanOrEqual(1);
    expect(verifyCaptcha(ch.id, String(ch.a + ch.b))).toBe(true);
  });

  it("rejects a wrong answer", () => {
    const ch = createCaptchaChallenge();
    expect(verifyCaptcha(ch.id, String(ch.a + ch.b + 1))).toBe(false);
  });

  it("is one-time use — the answer cannot be replayed", () => {
    const ch = createCaptchaChallenge();
    expect(verifyCaptcha(ch.id, String(ch.a + ch.b))).toBe(true);
    expect(verifyCaptcha(ch.id, String(ch.a + ch.b))).toBe(false);
  });

  it("rejects missing id or answer", () => {
    const ch = createCaptchaChallenge();
    expect(verifyCaptcha(undefined, "4")).toBe(false);
    expect(verifyCaptcha(ch.id, undefined)).toBe(false);
    expect(verifyCaptcha("unknown-id", "4")).toBe(false);
  });
});
