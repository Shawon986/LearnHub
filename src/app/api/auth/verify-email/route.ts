import { apiHandler, badRequest, json, parseJson } from "@/lib/api";
import { verifyEmailSchema } from "@/lib/validation/auth";
import { logAudit } from "@/lib/audit";
import { db } from "@/lib/db";

export const POST = apiHandler(async (req) => {
  const { token } = await parseJson(req, verifyEmailSchema);

  const record = await db.authToken.findUnique({ where: { token } });
  if (!record || record.type !== "EMAIL_VERIFY" || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest("This verification link is invalid or has expired.", "INVALID_TOKEN");
  }

  const [user] = await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    db.authToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await logAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "auth.verifyEmail",
    entityType: "User",
    entityId: user.id,
  });

  return json({ ok: true });
});
