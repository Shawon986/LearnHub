"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { useLanguage } from "@/components/i18n/language-provider";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";

const NAV_LINKS = [
  { label: "Courses", href: "/courses" },
  { label: "Teachers", href: "/teachers" },
  { label: "Live Classes", href: "/#live" },
  { label: "Recorded Classes", href: "/#recorded" },
  { label: "Become a Teacher", href: "/register" },
];

export interface HeaderUser {
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
}

export function SiteHeader({
  user,
  unreadNotifications = 0,
}: {
  user: HeaderUser | null;
  unreadNotifications?: number;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const { t } = useLanguage();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled ? "glass shadow-soft" : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="relative mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6">
        <Logo size="md" typewriter className="shrink-0" />

        {/* Desktop nav — centered in the middle zone, never overlaps the sides */}
        <nav className="hidden items-center justify-center gap-1 lg:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link
              key={t(link.label)}
              href={link.href}
              className="whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-semibold text-muted-fg transition-colors hover:bg-card-2 hover:text-foreground"
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-1.5">
          {/* Search bar — a real input; icon-only at lg, full width at xl+ */}
          <form action="/search" className="hidden lg:block" role="search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint-fg" />
              <input
                type="search"
                name="q"
                placeholder={t("Search courses, teachers…")}
                aria-label={t("Search courses, teachers…")}
                className="h-9 w-11 rounded-full border border-line bg-card pl-9 pr-3 text-[13px] text-foreground placeholder:text-faint-fg transition-all duration-300 focus:w-56 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25 xl:w-56"
              />
            </div>
          </form>

          <LanguageToggle className="mr-0.5" />
          <ThemeToggle />

          {user ? (
            <>
              <NotificationBell
                initialUnread={unreadNotifications}
                role={user.role}
                viewAllHref={
                  user.role === "TEACHER"
                    ? "/teacher/notifications"
                    : ["ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"].includes(user.role)
                      ? "/admin/notifications/view"
                      : "/dashboard/notifications"
                }
              />
              <UserMenu user={user} />
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button href="/login" variant="ghost" size="sm">
                Sign in
              </Button>
              <Button href="/register" size="sm">
                Get started
              </Button>
            </div>
          )}

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-fg transition-colors hover:bg-card-2 lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-x-0 top-16 bottom-0 z-30 lg:hidden"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden />
            <motion.nav
              aria-label="Mobile"
              className="glass absolute inset-x-0 top-0 flex flex-col gap-1 border-b border-line p-4"
              initial={reduceMotion ? false : { y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduceMotion ? undefined : { y: -12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
            >
              {/* Search on mobile lives here */}
              <form action="/search" className="relative mb-1" onSubmit={() => setMobileOpen(false)} role="search">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint-fg" />
                <input
                  type="search"
                  name="q"
                  placeholder={t("Search courses, teachers…")}
                  aria-label={t("Search courses, teachers…")}
                  className="h-10 w-full rounded-xl border border-line bg-card pl-9 pr-3 text-[13px] text-foreground placeholder:text-faint-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                />
              </form>
              {NAV_LINKS.map((link) => (
                <Link
                  key={t(link.label)}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-card-2"
                >
                  {t(link.label)}
                </Link>
              ))}
              {!user && (
                <div className="mt-2 flex flex-col gap-2 border-t border-line pt-4">
                  <Button href="/login" variant="secondary" className="w-full">
                    Sign in
                  </Button>
                  <Button href="/register" className="w-full">
                    Get started
                  </Button>
                </div>
              )}
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
