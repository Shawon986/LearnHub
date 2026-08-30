"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { Dropdown, DropdownSeparator } from "@/components/ui/dropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/i18n/language-provider";
import { useRealtimeStream } from "@/lib/realtime/provider";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: { checkoutPath?: string; conversationId?: string; disputeId?: string; liveClassId?: string; courseId?: string; bookingId?: string; withdrawalId?: string; paymentId?: string; teacherId?: string } | null;
  read: boolean;
  createdAt: string;
}

const ADMIN_ROLES = new Set(["ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"]);

/** Actionable link inside a notification, resolved per role (admins land on
 *  /admin/*, teachers on /teacher/*, students on /dashboard/*). */
function linkFor(item: NotificationItem, role?: string): string | null {
  const isAdmin = Boolean(role && ADMIN_ROLES.has(role));
  const isTeacher = role === "TEACHER";
  if (item.data?.checkoutPath) return item.data.checkoutPath;
  if (item.data?.conversationId) return `/messages/${item.data.conversationId}`;
  if (item.data?.disputeId) return isAdmin ? "/admin/disputes" : "/dashboard/disputes";
  if (item.data?.liveClassId)
    return isAdmin ? "/admin" : isTeacher ? "/teacher/live-classes" : "/dashboard/live";
  if (item.data?.courseId)
    return isAdmin ? "/admin/courses" : isTeacher ? "/teacher/courses" : "/dashboard/courses";
  if (item.data?.bookingId)
    return isAdmin
      ? "/admin/bookings"
      : isTeacher
        ? "/teacher/bookings"
        : item.data?.checkoutPath
          ? item.data.checkoutPath
          : "/dashboard/bookings";
  if (item.data?.withdrawalId) return isAdmin ? "/admin/withdrawals" : "/teacher/earnings";
  if (item.data?.paymentId) return isAdmin ? "/admin/payments" : "/dashboard/payments";
  if (item.data?.teacherId) return isAdmin ? "/admin/verification" : null;
  return null;
}

function publishUnread(next: number) {
  // Other components (sidebar badges) follow the bell's unread state.
  window.dispatchEvent(new CustomEvent("learnhub-unread", { detail: { unread: next } }));
}

export function NotificationBell({
  initialUnread = 0,
  viewAllHref = "/dashboard/notifications",
  role,
}: {
  initialUnread?: number;
  /** Where the "View all" footer link goes (role-aware, set by callers). */
  viewAllHref?: string;
  /** The user's role — notification links resolve to the right section. */
  role?: string;
}) {
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=50");
      if (res.ok) {
        const data = await res.json();
        setItems(data.notifications);
        setUnread(data.unread);
        // Keep sidebar badges in sync with the authoritative count.
        publishUnread(data.unread);
      }
    } catch {
      // Non-critical — the bell just stays empty.
    } finally {
      setLoaded(true);
    }
  }, []);

  // Fetch on mount (so the dropdown is never empty) and on every open.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      load();
    });
    return () => cancelAnimationFrame(raf);
  }, [load]);

  // Follow unread changes made elsewhere (e.g. the sidebar Notifications
  // item clearing everything) so both counters stay in sync.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ unread: number }>).detail;
      if (typeof detail?.unread === "number") setUnread(detail.unread);
    };
    window.addEventListener("learnhub-unread", handler);
    return () => window.removeEventListener("learnhub-unread", handler);
  }, []);

  // Real-time delivery: notifications arrive over the SHARED SSE stream
  // (one connection per app — the messaging inbox uses the same one).
  // A notification can arrive twice (instant bus push + DB-canonical poll),
  // so dedupe by id BEFORE touching state — otherwise the unread counter
  // incremented for every duplicate.
  const seenIds = useRef(new Set<string>());
  const { connection } = useRealtimeStream((raw) => {
    let event: { type?: string } & Partial<NotificationItem>;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }
    if (event.type === "notification") {
      const notification = event as NotificationItem;
      if (!notification.id || seenIds.current.has(notification.id)) return;
      seenIds.current.add(notification.id);
      setItems((prev) => [notification, ...(prev ?? []).slice(0, 49)]);
      setUnread((u) => {
        const next = u + 1;
        publishUnread(next);
        return next;
      });
    }
    if (event.type === "notification.read") {
      // Another device (or this one's sidebar click) marked notifications
      // read — refetch the authoritative count so this device's counter
      // clears too.
      const ids = (event as { ids?: string[] }).ids;
      if (Array.isArray(ids) && ids.length > 0) {
        load().catch(() => {});
      }
    }
  });
  const prevConn = useRef(connection);
  useEffect(() => {
    // Reconnected → refetch canonical state (reconciliation).
    if (prevConn.current === "reconnecting" && connection === "live") {
      load().catch(() => {});
    }
    prevConn.current = connection;
  }, [connection, load]);

  async function markAll() {
    setUnread(0);
    publishUnread(0);
    setItems((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await load();
  }

  /** Opening the bell clears the unread counter (everything becomes read). */
  function onOpen() {
    load().then(() => {
      markAll().catch(() => {});
    });
  }

  /** Clicking a notification opens it; once seen it leaves the popup list. */
  function onRowClick(n: NotificationItem) {
    if (!n.read) {
      setUnread((u) => {
        const next = Math.max(0, u - 1);
        publishUnread(next);
        return next;
      });
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      }).catch(() => {});
    }
    setItems((prev) => (prev ?? []).filter((i) => i.id !== n.id));
    const link = linkFor(n, role);
    if (link) {
      router.push(link);
    }
  }

  return (
    <Dropdown
      align="end"
      className="[&>div:first-child]:inline-flex"
      /* On phones the bell sits left of the user menu, so a right-aligned
         panel would poke off-screen — pin the panel across the viewport
         instead, just under the topbar. */
      panelClassName="max-sm:fixed max-sm:left-2 max-sm:right-2 max-sm:top-[4.5rem] max-sm:mt-0"
      trigger={
        <button
          type="button"
          onClick={onOpen}
          aria-label={t("Notifications") + ` (${unread} unread)`}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-fg transition-colors hover:bg-card-2 hover:text-foreground"
        >
          {unread > 0 ? <BellRing className="h-[18px] w-[18px]" /> : <Bell className="h-[18px] w-[18px]" />}
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-extrabold text-white ring-2 ring-card">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      }
    >
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2.5">
        <p className="text-[13px] font-bold text-foreground">{t("Notifications")}</p>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAll}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-fg hover:underline"
          >
            <CheckCheck className="h-3 w-3" /> {t("Mark all read")}
          </button>
        )}
      </div>

      <div className="max-h-[26rem] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto max-sm:w-full">
        {!loaded && items === null ? (
          <div className="space-y-3 p-3.5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : items === null || items.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-faint-fg">{t("No notifications yet")}</p>
        ) : (
          <ul className="py-1">
            {items.map((n) => (
              <li
                key={n.id}
                onClick={() => onRowClick(n)}
                className={cn(
                  "flex cursor-pointer gap-2.5 px-3.5 py-2.5 transition-colors hover:bg-card-2",
                  !n.read && "bg-brand-soft/40",
                )}
              >
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    n.read ? "bg-transparent" : "bg-brand",
                  )}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold text-foreground">{n.title}</p>
                  {n.body && (
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-fg">
                      {n.body}
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] text-faint-fg">{timeAgo(n.createdAt)}</p>
                  {linkFor(n, role) && (
                    <span className="mt-1 inline-block text-[11px] font-bold text-brand-fg">
                      {n.data?.checkoutPath ? "Complete payment →" : "Open →"}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <DropdownSeparator />
      <div className="flex items-center justify-between px-3.5 py-2">
        <p className="text-[11px] font-semibold text-faint-fg">{t("New events appear here in real time")}</p>
        <button
          type="button"
          onClick={() => router.push(viewAllHref)}
          className="text-[11px] font-bold text-brand-fg hover:underline"
        >
          {t("View all")} →
        </button>
      </div>
    </Dropdown>
  );
}
