import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ApiError, forbidden, unauthorized } from "@/lib/api";
import { ADMIN_ROLES, type Role } from "@/lib/constants";

// ============================================================
// Session management — stateless JWT in an httpOnly cookie.
//
// - Signed with HS256 (AUTH_SECRET, 32+ bytes)
// - 7-day expiry, SameSite=Lax, Secure in production
// - Roles are embedded for fast middleware checks, but every
//   privileged action re-reads the user from the DB via
//   requireUser()/requireRole() so role changes take effect
//   immediately and revoked users are blocked.
// ============================================================

const COOKIE_NAME = "session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload extends JWTPayload {
  sub: string; // user id
  role: Role;
  name: string;
  email: string;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.AUTH_SECRET);
}

export async function signSession(payload: Omit<SessionPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/** Set the session cookie (route handlers). */
export async function setSessionCookie(payload: Omit<SessionPayload, "iat" | "exp">) {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Read + verify the session cookie (server components / route handlers). */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** Current user from DB (fresh — respects role/status changes). Null if session invalid. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.sub } });
  if (!user || user.status !== "ACTIVE") return null;
  return user;
}

/** Throw 401 unless signed in. Returns the fresh user row. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

/** Throw 403 unless the user holds one of the given roles. Returns fresh user. */
export async function requireRole(...roles: string[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw forbidden("You do not have permission to access this resource.");
  }
  return user;
}

export async function requireAdmin() {
  return requireRole(...ADMIN_ROLES);
}

export function isAdminRole(role: string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

/** Renders inside Next.js pages/layouts: redirect instead of throwing. */
export function redirectIfUnauthorized(session: SessionPayload | null, requiredRole: string) {
  if (!session) return "/login";
  if (requiredRole === "STUDENT") {
    if (session.role === "STUDENT") return null;
    return isAdminRole(session.role) ? "/admin" : "/teacher";
  }
  if (requiredRole === "TEACHER") {
    if (session.role === "TEACHER" || isAdminRole(session.role)) return null;
    return "/dashboard";
  }
  // Admin areas.
  if (isAdminRole(session.role)) return null;
  return session.role === "TEACHER" ? "/teacher" : "/dashboard";
}

/** Shared type guard so UI code can discriminate safely. */
export function assertSessionRole(session: SessionPayload | null, roles: string[]) {
  if (!session || !roles.includes(session.role)) {
    throw new ApiError(403, "FORBIDDEN", "Access denied.");
  }
  return session;
}
