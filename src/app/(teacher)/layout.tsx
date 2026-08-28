import { redirect } from "next/navigation";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { homeFor } from "@/lib/nav";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/teacher");
  if (user.role !== "TEACHER" && !isAdminRole(user.role)) redirect(homeFor(user.role));

  return (
    <DashboardShell
      user={{ name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl }}
      role={user.role}
      accent="teacher"
    >
      {children}
    </DashboardShell>
  );
}
