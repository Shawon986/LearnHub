import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getLiveVideoProvider } from "@/lib/live/webrtc";
import { ClassroomShell, type ClassroomProps } from "./classroom-shell";

export const metadata: Metadata = { title: "Live Classroom" };

export default async function ClassroomPage({
  params,
}: {
  params: Promise<{ liveClassId: string }>;
}) {
  const { liveClassId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/classroom/${liveClassId}`);

  const live = await db.liveClass.findUnique({
    where: { id: liveClassId },
    include: {
      teacher: { select: { id: true, name: true, avatarUrl: true } },
      participants: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
    },
  });
  if (!live) notFound();

  const isHost = live.teacherId === user.id;
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "MODERATOR", "SUPPORT"].includes(user.role);
  const participant = live.participants.find((p) => p.userId === user.id);
  if (!isHost && !isAdmin && !participant) {
    redirect("/dashboard/live");
  }

  // WebRTC room credentials (dev provider returns empty strings — the UI
  // shows avatar tiles; LiveKit returns a real token + wss URL).
  let room = { roomName: "", token: "", url: "" };
  if (live.status === "LIVE") {
    try {
      room = await getLiveVideoProvider().joinRoom({
        classId: liveClassId,
        userId: user.id,
        userName: user.name,
        role: isHost ? "HOST" : "STUDENT",
      });
    } catch (e) {
      console.error("[classroom] WebRTC join failed:", e);
    }
  }

  const props: ClassroomProps = {
    classId: liveClassId,
    classTitle: live.title,
    status: live.status,
    isHost: isHost || isAdmin,
    chatLocked: live.chatLocked,
    user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
    host: { id: live.teacher.id, name: live.teacher.name, avatarUrl: live.teacher.avatarUrl },
    participants: live.participants.map((p) => ({
      id: p.userId,
      name: p.user.name,
      avatarUrl: p.user.avatarUrl,
      muted: p.muted,
      handRaised: false,
      joined: Boolean(p.joinedAt),
    })),
    room,
  };

  return <ClassroomShell {...props} />;
}
