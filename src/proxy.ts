import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// ============================================================
// Edge middleware: cheap JWT presence/role checks + security
// headers. Authorization is enforced AGAIN server-side in
// layouts/route handlers (defense in depth — never trust
// middleware alone).
// ============================================================

const ROUTE_ROLES: { prefix: string; roles: string[] }[] = [
  { prefix: "/dashboard", roles: ["STUDENT"] },
  { prefix: "/teacher", roles: ["TEACHER", "ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"] },
  { prefix: "/admin", roles: ["ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"] },
  { prefix: "/checkout", roles: ["STUDENT", "TEACHER"] },
  { prefix: "/messages", roles: ["STUDENT", "TEACHER"] },
];

const ADMIN_ROLES = new Set(["ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"]);

let cachedKey: Uint8Array | null = null;
function secretKey(): Uint8Array {
  if (!cachedKey) cachedKey = new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
  return cachedKey;
}

async function readSession(req: NextRequest): Promise<{ sub: string; role: string } | null> {
  const token = req.cookies.get("session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

function homeFor(role: string): string {
  if (ADMIN_ROLES.has(role)) return "/admin";
  if (role === "TEACHER") return "/teacher";
  return "/dashboard";
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // --- Security headers on every response ---------------------
  const headers = new Headers();
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(self), geolocation=(), interest-cohort=()",
  );

  // --- Route protection ----------------------------------------
  const match = ROUTE_ROLES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`));
  if (match) {
    const session = await readSession(req);
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (!match.roles.includes(session.role)) {
      const url = req.nextUrl.clone();
      url.pathname = homeFor(session.role);
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  // Signed-in users shouldn't see auth pages.
  if (pathname === "/login" || pathname === "/register") {
    const session = await readSession(req);
    if (session) {
      const url = req.nextUrl.clone();
      url.pathname = homeFor(session.role);
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next({ headers });
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/teacher/:path*",
    "/admin/:path*",
    "/checkout/:path*",
    "/messages/:path*",
    "/login",
    "/register",
  ],
};
