import { apiHandler, badRequest, json, parseJson } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";

export const POST = apiHandler(async (req) => {
  const { token, password } = await parseJson(req, resetPasswordSchema);

  const record = await db.authToken.findUnique({ where: { token } });
  if (!record || record.type !== "PASSWORD_RESET" || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest("This reset link is invalid or has expired.", "INVALID_TOKEN");
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db.$transaction([
    // sessionVersion bump revokes all previously issued sessions for
    // this account — the password reset logs everyone out everywhere.
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }),
    db.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "auth.resetPassword",
    entityType: "User",
    entityId: user.id,
  });

  return json({ ok: true });
});
