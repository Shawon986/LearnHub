import { apiHandler, json, parseJson } from "@/lib/api";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { generateToken } from "@/lib/utils";
import { sendPasswordResetEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { db } from "@/lib/db";

export const POST = apiHandler(async (req) => {
  const ip = clientIp(req);
  const rl = rateLimit(`forgot:${ip}`, { limit: 5, windowMs: 15 * 60_000 });
  if (!rl.ok) return json({ ok: true }); // silent — avoids both abuse and enumeration

  const { email } = await parseJson(req, forgotPasswordSchema);
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  if (user && user.status === "ACTIVE") {
    const token = generateToken();
    await db.authToken.create({
      data: {
        userId: user.id,
        type: "PASSWORD_RESET",
        token,
        expiresAt: new Date(Date.now() + 60 * 60_000), // 1 hour
      },
    });
    await sendPasswordResetEmail(user.email, user.name, token);
  }

  // Always the same response — no account enumeration.
  return json({ ok: true });
});
