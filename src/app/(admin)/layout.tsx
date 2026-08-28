import { redirect } from "next/navigation";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { unreadNotificationCount } from "@/lib/notifications";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !isAdminRole(user.role)) redirect("/login?next=/admin");

  const unread = await unreadNotificationCount(user.id);

  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }}
      role={user.role}
      accent="admin"
      unreadNotifications={unread}
    >
      {children}
    </DashboardShell>
  );
}
