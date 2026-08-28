import { headers } from "next/headers";
import { db } from "@/lib/db";

// Audit logging for sensitive platform actions.
// actor comes from the authenticated session, never from the client.

interface AuditInput {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string; // e.g. "payment.refund", "course.publish"
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    const h = await headers();
    await db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: (input.metadata ?? {}) as object,
        ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        userAgent: h.get("user-agent")?.slice(0, 500) ?? null,
      },
    });
  } catch (err) {
    // Never let audit failure break the actual operation.
    console.error("[audit] failed to write audit log:", err);
  }
}
