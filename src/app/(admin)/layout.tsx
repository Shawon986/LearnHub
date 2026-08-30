import { redirect } from "next/navigation";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { unreadNotificationCount } from "@/lib/notifications";
import { unreadMessageCount } from "@/lib/messaging/unread";
import { db } from "@/lib/db";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) redirect("/login?next=/admin");

  const [unread, unreadMessages, pendingVerifications] = await Promise.all([
    unreadNotificationCount(user.id),
    unreadMessageCount(user.id),
    db.teacherVerification.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }}
      role={user.role}
      accent="admin"
      unreadNotifications={unread}
      unreadMessages={unreadMessages}
      pendingVerifications={pendingVerifications}
    >
      {children}
    </DashboardShell>
  );
}
