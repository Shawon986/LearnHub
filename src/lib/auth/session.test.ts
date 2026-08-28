import { describe, expect, it } from "vitest";
import { assertSessionRole, redirectIfUnauthorized, type SessionPayload } from "./session";

const session = (role: string): SessionPayload =>
  ({ sub: "u1", role, name: "Test", email: "t@test.dev" }) as SessionPayload;

describe("redirectIfUnauthorized (role routing)", () => {
  it("lets a student into /dashboard", () => {
    expect(redirectIfUnauthorized(session("STUDENT"), "STUDENT")).toBeNull();
  });

  it("sends a teacher away from /dashboard", () => {
    expect(redirectIfUnauthorized(session("TEACHER"), "STUDENT")).toBe("/teacher");
  });

  it("sends a student away from /admin", () => {
    expect(redirectIfUnauthorized(session("STUDENT"), "ADMIN")).toBe("/dashboard");
  });

  it("lets admins into teacher areas", () => {
    expect(redirectIfUnauthorized(session("ADMIN"), "TEACHER")).toBeNull();
  });

  it("redirects anonymous users to login", () => {
    expect(redirectIfUnauthorized(null, "STUDENT")).toBe("/login");
  });
});

describe("assertSessionRole", () => {
  it("passes when the role matches", () => {
    expect(() => assertSessionRole(session("ADMIN"), ["ADMIN", "SUPER_ADMIN"])).not.toThrow();
  });

  it("throws for mismatched roles", () => {
    expect(() => assertSessionRole(session("STUDENT"), ["ADMIN"])).toThrow();
  });

  it("throws for missing sessions", () => {
    expect(() => assertSessionRole(null, ["ADMIN"])).toThrow();
  });
});
