import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { safeJsonParse } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Audit Logs" };

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/audit-logs");
  const { action } = await searchParams;

  const logs = await db.auditLog.findMany({
    where: action && action !== "ALL" ? { action: { contains: action } } : {},
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Audit Logs</h1>
          <p className="mt-1 text-sm text-muted-fg">
            Every sensitive action is recorded — who, what, when, from where.
          </p>
        </div>
        <form method="GET" className="flex gap-2">
          <input
            name="action"
            defaultValue={action ?? ""}
            placeholder="Filter by action (e.g. payment.refund)…"
            className="h-9 w-64 rounded-xl border border-line bg-card px-3 text-[13px] placeholder:text-faint-fg focus:border-brand focus:outline-none"
          />
          <button type="submit" className="h-9 rounded-xl bg-brand px-4 text-[13px] font-bold text-white hover:bg-brand-hover">
            Filter
          </button>
        </form>
      </div>

      {logs.length === 0 ? (
        <EmptyState icon={<ScrollText />} title="No audit entries" description="Actions appear here as they happen." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-175 text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">
                <th className="px-5 py-3">When</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="hidden px-4 py-3 md:table-cell">Entity</th>
                <th className="hidden px-4 py-3 lg:table-cell">Details</th>
                <th className="hidden px-4 py-3 xl:table-cell">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.map((log) => {
                const meta = safeJsonParse<Record<string, unknown>>(log.metadata, {});
                return (
                  <tr key={log.id} className="transition-colors hover:bg-card-2/50">
                    <td className="whitespace-nowrap px-5 py-3 text-[12px] tabular-nums text-muted-fg">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-semibold text-foreground">
                      {log.actorEmail ?? log.actorId?.slice(0, 8) ?? "system"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral" size="sm">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-[12px] text-muted-fg md:table-cell">
                      {log.entityType ?? "—"} {log.entityId ? `· ${log.entityId.slice(0, 8)}` : ""}
                    </td>
                    <td className="hidden max-w-64 truncate px-4 py-3 text-[12px] text-faint-fg lg:table-cell">
                      {JSON.stringify(meta)}
                    </td>
                    <td className="hidden px-4 py-3 text-[12px] text-faint-fg xl:table-cell">{log.ip ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
