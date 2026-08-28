import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { AnnouncementForm } from "./announcement-form";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/notifications");

  const [announcements, notificationCount] = await Promise.all([
    db.announcement.findMany({
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.notification.count(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Announcements</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Broadcast to students and teachers — {notificationCount.toLocaleString()} notifications delivered so far.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <AnnouncementForm />

        <section aria-labelledby="history-heading">
          <h2 id="history-heading" className="mb-4 font-display text-base font-bold text-foreground">
            History
          </h2>
          {announcements.length === 0 ? (
            <EmptyState
              compact
              icon={<Megaphone />}
              title="No announcements yet"
              description="Send your first one to the whole platform."
            />
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-[14px] font-bold text-foreground">{a.title}</h3>
                    <Badge variant={a.isActive ? "success" : "neutral"}>
                      {a.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="brand" size="sm">
                      {a.audience}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-fg">{a.body}</p>
                  <p className="mt-2 text-[11px] text-faint-fg">
                    {a.createdBy.name} · {formatDate(a.createdAt)}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
