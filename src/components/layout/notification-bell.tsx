"use client";

import { useCallback, useState } from "react";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { Dropdown, DropdownSeparator } from "@/components/ui/dropdown";
import { Skeleton } from "@/components/ui/skeleton";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationBell({ initialUnread = 0 }: { initialUnread?: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationItem[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {
      // Non-critical — the bell just stays empty.
    }
  }, []);

  async function markAll() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await load();
  }

  return (
    <Dropdown
      align="end"
      className="[&>div:first-child]:inline-flex"
      trigger={
        <button
          type="button"
          aria-label={`Notifications (${unread} unread)`}
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
        <p className="text-[13px] font-bold text-foreground">Notifications</p>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAll}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-fg hover:underline"
          >
            <CheckCheck className="h-3 w-3" /> Mark all read
          </button>
        )}
      </div>

      <div className="max-h-80 w-80 overflow-y-auto">
        {items === null ? (
          <div className="space-y-3 p-3.5">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-faint-fg">No notifications yet</p>
        ) : (
          <ul className="py-1">
            {items.map((n) => (
              <li key={n.id} className={cn("flex gap-2.5 px-3.5 py-2.5", !n.read && "bg-brand-soft/40")}>
                <span
                  className={cn(
                    "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                    n.read ? "bg-transparent" : "bg-brand",
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold text-foreground">{n.title}</p>
                  {n.body && <p className="line-clamp-2 text-[11px] leading-relaxed text-muted-fg">{n.body}</p>}
                  <p className="mt-0.5 text-[10px] text-faint-fg">{timeAgo(n.createdAt)}</p>
                </div>
              </li>
            ))}
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
