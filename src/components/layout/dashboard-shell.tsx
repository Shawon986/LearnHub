"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronsLeft, ChevronsRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/i18n/language-provider";
import { navFor } from "@/lib/nav";

interface DashboardShellProps {
  user: { name: string; email: string; role: string; avatarUrl: string | null };
  /** Resolved client-side so icon components never cross the server/client boundary. */
  role: string;
  accent?: "student" | "teacher" | "admin";
  title?: string;
  unreadNotifications?: number;
  unreadMessages?: number;
  /** Pending teacher verifications (badge on the admin Verification item). */
  pendingVerifications?: number;
  /** Pending withdrawal requests (badge on the admin Withdrawals item). */
  pendingWithdrawals?: number;
  /** Pending payments (badge on the admin Payments item). */
  pendingPayments?: number;
  children: ReactNode;
}

const ACCENT_ACTIVE = {
  student: "bg-brand-soft text-brand-fg",
  teacher: "bg-accent-soft text-accent",
  admin: "bg-gold-soft text-gold",
};

const ACCENT_PILL = {
  student: "bg-brand",
  teacher: "bg-accent",
  admin: "bg-gold",
};

export function DashboardShell({
  user,
  role,
  accent = "student",
  title,
  unreadNotifications = 0,
  unreadMessages = 0,
  pendingVerifications = 0,
  pendingWithdrawals = 0,
  pendingPayments = 0,
  children,
}: DashboardShellProps) {
  const nav = navFor(role);
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifUnread, setNotifUnread] = useState(unreadNotifications);
  const reduceMotion = useReducedMotion();
  const { t } = useLanguage();

  // Follow the bell's unread state so the sidebar badge clears instantly.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ unread: number }>).detail;
      if (typeof detail?.unread === "number") setNotifUnread(detail.unread);
    };
    window.addEventListener("learnhub-unread", handler);
    return () => window.removeEventListener("learnhub-unread", handler);
  }, []);

  const viewAllHref =
    role === "TEACHER"
      ? "/teacher/notifications"
      : ["ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"].includes(role)
        ? "/admin/notifications/view"
        : "/dashboard/notifications";

  // Restore persisted sidebar state. Deferred one frame so the
  // first paint stays consistent with the server HTML.
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "1") {
      const raf = requestAnimationFrame(() => setCollapsed(true));
      return () => cancelAnimationFrame(raf);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const isActive = (href: string) =>
    href === pathname ||
    (href !== "/" &&
      // /admin/notifications/view must not light up the Announcements item.
      href !== "/admin/notifications" &&
      pathname.startsWith(`${href}/`));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 items-center border-b border-line", collapsed ? "justify-center" : "px-5")}>
        <Link href="/" aria-label="LearnHub home">
          <Logo animated={false} withText={!collapsed} size="sm" />
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3 no-scrollbar" aria-label="Dashboard">
        {nav.map((item) => {
          const active = isActive(item.href);
          const count =
            item.href === "/messages"
              ? unreadMessages
              : item.href === "/admin/verification"
                ? pendingVerifications
                : item.href === "/admin/withdrawals"
                  ? pendingWithdrawals
                  : item.href === "/admin/payments"
                    ? pendingPayments
                    : (item.href === "/admin/notifications/view" ||
                      (item.href.endsWith("/notifications") && item.href !== "/admin/notifications"))
                    ? notifUnread
                    : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                setMobileOpen(false);
                // Clicking the Notifications menu item clears both counters.
                if (count > 0) {
                  setNotifUnread(0);
                  window.dispatchEvent(
                    new CustomEvent("learnhub-unread", { detail: { unread: 0 } }),
                  );
                  fetch("/api/notifications", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ all: true }),
                  }).catch(() => {});
                }
              }}
              title={collapsed ? t(item.label) : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors",
                active ? ACCENT_ACTIVE[accent] : "text-muted-fg hover:bg-card-2 hover:text-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              {active && (
                <span
                  className={cn("absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full", ACCENT_PILL[accent])}
                  aria-hidden
                />
              )}
              <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
              {!collapsed && <span className="flex-1 truncate">{t(item.label)}</span>}
              {!collapsed && count > 0 && (
                <Badge variant="brand" size="sm" className="ml-auto tabular-nums">
                  {count > 99 ? "99+" : count}
                </Badge>
              )}
              {!collapsed && item.badge && (
                <Badge variant="outline" className="ml-auto">
                  {t(item.badge)}
                </Badge>
              )}
              {collapsed && count > 0 && (
                <span
                  className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-card"
                  aria-hidden
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 border-t border-line p-3">
        {!collapsed && <ThemeToggle />}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-xl text-[12px] font-bold text-muted-fg transition-colors hover:bg-card-2 hover:text-foreground",
          )}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              {t("Collapse")}
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-line bg-card transition-[width] duration-300 lg:block",
          collapsed ? "w-[76px]" : "w-[260px]",
        )}
      >
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden />
            <motion.aside
              className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r border-line bg-card shadow-lift"
              initial={reduceMotion ? false : { x: -280 }}
              animate={{ x: 0 }}
              exit={reduceMotion ? undefined : { x: -280 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              aria-label="Dashboard navigation"
            >
              {sidebar}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className={cn("flex min-h-screen flex-col transition-[padding] duration-300", collapsed ? "lg:pl-[76px]" : "lg:pl-[260px]")}>
        {/* Topbar */}
        <header className="glass sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-fg transition-colors hover:bg-card-2 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="truncate font-display text-[15px] font-bold text-foreground">
              {title ?? t(nav.find((n) => isActive(n.href))?.label ?? "Dashboard")}
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            <LanguageToggle className="hidden sm:flex" />
            <NotificationBell initialUnread={notifUnread} viewAllHref={viewAllHref} role={role} />
            <UserMenu user={user} />
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
