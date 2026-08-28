import { apiHandler, json, parseJson } from "@/lib/api";
import { resendVerificationSchema } from "@/lib/validation/auth";
import { generateToken } from "@/lib/utils";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { db } from "@/lib/db";

export const POST = apiHandler(async (req) => {
  const ip = clientIp(req);
  const rl = rateLimit(`resend:${ip}`, { limit: 3, windowMs: 15 * 60_000 });
  if (!rl.ok) return json({ ok: true }); // don't reveal rate limiting either

  const { email } = await parseJson(req, resendVerificationSchema);
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });

  // Always respond ok — no account enumeration.
  if (!user || user.emailVerified) return json({ ok: true });

  const token = generateToken();
  await db.authToken.create({
    data: {
      userId: user.id,
      type: "EMAIL_VERIFY",
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
    },
  });
  await sendVerificationEmail(user.email, user.name, token);

  return json({
    ok: true,
    devVerificationUrl:
      process.env.NODE_ENV !== "production" && process.env.EMAIL_PROVIDER !== "resend"
        ? `/verify-email?token=${token}`
        : undefined,
  });
});
