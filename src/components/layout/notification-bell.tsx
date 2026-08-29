"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { Dropdown, DropdownSeparator } from "@/components/ui/dropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/i18n/language-provider";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: { checkoutPath?: string; conversationId?: string; disputeId?: string; liveClassId?: string; courseId?: string } | null;
  read: boolean;
  createdAt: string;
}

/** Actionable link inside a notification, when the event carries one. */
function linkFor(item: NotificationItem): string | null {
  if (item.data?.checkoutPath) return item.data.checkoutPath;
  if (item.data?.conversationId) return `/messages/${item.data.conversationId}`;
  if (item.data?.disputeId) return "/dashboard/disputes";
  if (item.data?.liveClassId) return "/dashboard/live";
  if (item.data?.courseId) return "/dashboard/courses";
  return null;
}

export function NotificationBell({ initialUnread = 0 }: { initialUnread?: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useLanguage();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (res.ok) {
        const data = await res.json();
        setItems(data.notifications);
        setUnread(data.unread);
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

  // Real-time delivery: notifications arrive over the personal SSE
  // channel (the same stream the messaging inbox uses).
  useEffect(() => {
    const es = new EventSource("/api/messages/stream");
    es.onmessage = (m) => {
      if (m.data.startsWith(":")) return;
      let event: { type?: string } & Partial<NotificationItem>;
      try {
        event = JSON.parse(m.data);
      } catch {
        return;
      }
      if (event.type === "notification") {
        setItems((prev) => [
          { ...(event as NotificationItem) },
          ...(prev ?? []).slice(0, 8),
        ]);
        setUnread((u) => u + 1);
      }
    };
    return () => es.close();
  }, []);

  async function markAll() {
    setUnread(0);
    setItems((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await load();
  }

  /** Clicking a notification: mark it read (badge decrements) and open it. */
  function onRowClick(n: NotificationItem) {
    if (!n.read) {
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) => (prev ?? []).map((i) => (i.id === n.id ? { ...i, read: true } : i)));
      fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      }).catch(() => {});
    }
    const link = linkFor(n);
    if (link) {
      router.push(link);
    } else {
      setExpandedId((cur) => (cur === n.id ? null : n.id));
    }
  }

  return (
    <Dropdown
      align="end"
      className="[&>div:first-child]:inline-flex"
      trigger={
        <button
          type="button"
          onClick={() => load()}
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

      <div className="max-h-80 w-80 overflow-y-auto">
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
            {items.map((n) => {
              const expanded = expandedId === n.id;
              return (
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
                      <p
                        className={cn(
                          "text-[11px] leading-relaxed text-muted-fg",
                          expanded ? "whitespace-pre-line" : "line-clamp-2",
                        )}
                      >
                        {n.body}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-faint-fg">{timeAgo(n.createdAt)}</p>
                    {linkFor(n) && (
                      <span className="mt-1 inline-block text-[11px] font-bold text-brand-fg">
                        {n.data?.checkoutPath ? "Complete payment →" : "Open →"}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <DropdownSeparator />
      <p className="px-3.5 py-2 text-center text-[11px] font-semibold text-faint-fg">
        New events appear here in real time
      </p>
    </Dropdown>
  );
}
