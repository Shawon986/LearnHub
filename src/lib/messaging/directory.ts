import { db } from "@/lib/db";

export interface AdminOversightEntry {
  id: string;
  pairName: string;
  lastContent: string;
  lastAt: string;
}

/** Every teacher ↔ student DIRECT conversation (admin oversight list). */
export async function getAdminOversight(): Promise<AdminOversightEntry[]> {
  const all = await db.conversation.findMany({
    where: { type: "DIRECT" },
    include: {
      participants: { include: { user: { select: { name: true, role: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  return all
    .filter(
      (c) =>
        c.participants.some((p) => p.user.role === "TEACHER") &&
        c.participants.some((p) => p.user.role === "STUDENT"),
    )
    .map((c) => {
      const last = c.messages[0] ?? null;
      return {
        id: c.id,
        pairName: c.participants
          .filter((p) => p.user.role === "STUDENT" || p.user.role === "TEACHER")
          .map((p) => p.user.name)
          .join(" ↔ "),
        lastContent: last ? (last.type === "IMAGE" ? "📷 Image" : last.content) : "No messages yet",
        lastAt: last?.createdAt.toISOString() ?? c.updatedAt.toISOString(),
      };
    });
}

export interface MessageDirectoryData {
  /** Teachers the admin can message directly from the inbox. */
  teachers: { id: string; name: string; avatarUrl: string | null; headline: string | null }[];
  /** The support admin everyone else can message with one click. */
  adminId: string | null;
}

/** Contact directory for the messaging inbox, resolved per role. */
export async function getMessageDirectory(
  role: string,
): Promise<MessageDirectoryData> {
  if (["ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"].includes(role)) {
    const teachers = await db.user.findMany({
      where: { role: "TEACHER", status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        teacherProfile: { select: { headline: true } },
      },
      orderBy: { name: "asc" },
      take: 20,
    });
    return {
      teachers: teachers.map((t) => ({
        id: t.id,
        name: t.name,
        avatarUrl: t.avatarUrl,
        headline: t.teacherProfile?.headline ?? null,
      })),
      adminId: null,
    };
  }

  const admin = await db.user.findFirst({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" },
    select: { id: true },
  });
  return { teachers: [], adminId: admin?.id ?? null };
}
