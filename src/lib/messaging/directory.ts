import { db } from "@/lib/db";

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
