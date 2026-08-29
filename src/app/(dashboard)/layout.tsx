import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { unreadNotificationCount } from "@/lib/notifications";
import { unreadMessageCount } from "@/lib/messaging/unread";
import { sendDueBookingReminders } from "@/lib/reminders";
import { homeFor } from "@/lib/nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role !== "STUDENT") redirect(homeFor(user.role));

  // Opportunistic reminders (scheduled job in Phase 9+).
  sendDueBookingReminders().catch(() => {});

  const [unread, unreadMessages] = await Promise.all([
    unreadNotificationCount(user.id),
    unreadMessageCount(user.id),
  ]);

  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }}
      role={user.role}
      accent="student"
      unreadNotifications={unread}
      unreadMessages={unreadMessages}
    >
      {children}
    </DashboardShell>
  );
}
