import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleDollarSign, GraduationCap, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { getTeacherAnalytics } from "@/lib/analytics";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AreaChart } from "@/components/charts/charts";
import { RangePicker } from "@/components/charts/range-picker";
import { formatBDT, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Analytics" };

export default async function TeacherAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/teacher/analytics");
  const { range: rawRange } = await searchParams;
  const range = ["7", "30", "90", "365"].includes(rawRange ?? "") ? Number(rawRange) : 30;

  const { earningsSeries, performance, totals } = await getTeacherAnalytics(user.id, range);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-fg">How your teaching business is performing.</p>
        </div>
        <RangePicker range={String(range)} basePath="/teacher/analytics" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Earnings" value={formatBDT(totals.earnings)} icon={<CircleDollarSign />} tone="gold" />
        <StatCard label="New enrollments" value={formatNumber(totals.enrollments)} icon={<Users />} tone="accent" />
        <StatCard label="Active courses" value={formatNumber(performance.length)} icon={<GraduationCap />} tone="brand" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Earnings over time</CardTitle>
          <CardDescription>Wallet credits per day (85% of sales)</CardDescription>
        </CardHeader>
        <CardContent>
          <AreaChart data={earningsSeries} money />
        </CardContent>
      </Card>

      <Card className="overflow-x-auto">
        <CardHeader>
          <CardTitle>Course performance</CardTitle>
          <CardDescription>Students, completions and revenue per course in this window</CardDescription>
        </CardHeader>
        <table className="w-full min-w-150 text-left text-[13px]">
          <thead>
            <tr className="border-b border-line text-[10px] font-extrabold uppercase tracking-wide text-faint-fg">
              <th className="px-5 py-2">Course</th>
              <th className="px-4 py-2 text-right">Students</th>
              <th className="px-4 py-2 text-right">Completed</th>
              <th className="px-4 py-2 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {performance.map((p) => (
              <tr key={p.title} className="transition-colors hover:bg-card-2/50">
                <td className="px-5 py-3">
                  <p className="font-bold text-foreground">{p.title}</p>
                  <p className="text-[11px] text-faint-fg">{p.category}</p>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">{p.students}</td>
                <td className="px-4 py-3 text-right tabular-nums text-foreground">{p.completed}</td>
                <td className="px-4 py-3 text-right font-extrabold tabular-nums text-foreground">{formatBDT(p.revenue)}</td>
              </tr>
            ))}
            {performance.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-center text-faint-fg">
                  No course activity in this window yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
