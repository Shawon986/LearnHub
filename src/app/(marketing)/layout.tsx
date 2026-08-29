import { getSession } from "@/lib/auth/session";
import { unreadNotificationCount } from "@/lib/notifications";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const user = session
    ? { name: session.name, email: session.email, role: session.role, avatarUrl: null }
    : null;
  const unread = session ? await unreadNotificationCount(session.sub) : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader user={user} unreadNotifications={unread} />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
