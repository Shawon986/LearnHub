import { apiHandler, json, parseJson, unauthorized } from "@/lib/api";
import { loginSchema } from "@/lib/validation/auth";
import { verifyPassword } from "@/lib/auth/password";
import { setSessionCookie } from "@/lib/auth/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";

export const POST = apiHandler(async (req) => {
  const ip = clientIp(req);
  const rl = rateLimit(`login:${ip}`, { limit: 10, windowMs: 15 * 60_000 });
  if (!rl.ok) throw unauthorized("Too many login attempts. Please try again later.");

  const input = await parseJson(req, loginSchema);
  const email = input.email.toLowerCase().trim();

  const rlEmail = rateLimit(`login-email:${email}`, { limit: 5, windowMs: 15 * 60_000 });
  if (!rlEmail.ok) throw unauthorized("Too many attempts for this account. Try again later.");

  const user = await db.user.findUnique({ where: { email } });

  // Uniform error — never reveal which part was wrong.
  const invalid = unauthorized("Invalid email or password.");
  if (!user) throw invalid;
  if (user.status === "BANNED") throw unauthorized("This account has been banned. Contact support.");
  if (user.status === "SUSPENDED") {
    throw unauthorized("This account is suspended. Contact support.");
  }

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw invalid;

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setSessionCookie({
    sub: user.id,
    role: user.role as never,
    name: user.name,
    email: user.email,
  });
  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "auth.login",
    entityType: "User",
    entityId: user.id,
  });

  return json({
    ok: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      emailVerified: Boolean(user.emailVerified),
    },
  });
});
