import { apiHandler, badRequest, json, parseJson } from "@/lib/api";
import { registerSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { generateReferralCode, generateToken } from "@/lib/utils";
import { sendVerificationEmail } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";

export const POST = apiHandler(async (req) => {
  const ip = clientIp(req);
  const rl = rateLimit(`register:${ip}`, { limit: 5, windowMs: 15 * 60_000 });
  if (!rl.ok) throw badRequest("Too many signup attempts. Please try again later.", "RATE_LIMITED");

  const input = await parseJson(req, registerSchema);
  const email = input.email.toLowerCase().trim();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    // Don't leak whether the email exists with a different message.
    throw badRequest("An account with this email already exists.", "EMAIL_TAKEN");
  }

  // Referral handling — invalid codes are ignored silently.
  let referrerId: string | null = null;
  if (input.referralCode) {
    const referrer = await db.user.findUnique({ where: { referralCode: input.referralCode } });
    if (referrer && referrer.id) referrerId = referrer.id;
  }

  const passwordHash = await hashPassword(input.password);
  const isTeacher = input.role === "TEACHER";

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      name: input.name.trim(),
      role: input.role,
      referralCode: generateReferralCode(input.name),
      referredById: referrerId,
      ...(isTeacher
        ? { teacherProfile: { create: { headline: `Teaching ${input.name.trim().split(" ")[0]}'s craft` } } }
        : { studentProfile: { create: {} } }),
    },
  });

  if (isTeacher) {
    await db.teacherWallet.create({ data: { teacherId: user.id } });
  }
  if (referrerId) {
    await db.referral.create({
      data: { referrerId, refereeId: user.id, status: "PENDING" },
    });
  }

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
  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "auth.register",
    entityType: "User",
    entityId: user.id,
    metadata: { role: user.role, viaReferral: Boolean(referrerId) },
  });

  // In development the console email provider prints the link; we also
  // return it so the UI can show a one-click "open verification link".
  const devVerificationUrl =
    process.env.NODE_ENV !== "production" && process.env.EMAIL_PROVIDER !== "resend"
      ? `/verify-email?token=${token}`
      : undefined;

  return json(
    { ok: true, email: user.email, role: user.role, devVerificationUrl },
    { status: 201 },
  );
});
