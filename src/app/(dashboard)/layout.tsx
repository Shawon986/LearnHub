import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { unreadNotificationCount } from "@/lib/notifications";
import { unreadMessageCount } from "@/lib/messaging/unread";
import { sendDueBookingReminders } from "@/lib/reminders";
import { updateStreak } from "@/lib/gamification";
import { homeFor } from "@/lib/nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role !== "STUDENT") redirect(homeFor(user.role));

  // Opportunistic reminders (scheduled job in Phase 9+).
  sendDueBookingReminders().catch(() => {});

  // Daily streak — any dashboard visit counts as an active day.
  updateStreak(user.id).catch(() => {});

  const [unread, unreadMessages] = await Promise.all([
    unreadNotificationCount(user.id),
    unreadMessageCount(user.id),
  ]);

  return (
    <DashboardShell
      user={{ id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }}
      role={user.role}
      accent="student"
      unreadNotifications={unread}
      unreadMessages={unreadMessages}
    >
      {children}
    </DashboardShell>
  );
}
