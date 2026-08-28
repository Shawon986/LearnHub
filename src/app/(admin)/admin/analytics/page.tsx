import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleDollarSign, Percent, ShoppingCart, TrendingUp, UserPlus, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import {
  getAdminKpis,
  getEnrollmentSeries,
  getMethodSplit,
  getRevenueSeries,
  getTopCourses,
  getTopTeachers,
} from "@/lib/analytics";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AreaChart, BarChart, DonutChart, HBarList } from "@/components/charts/charts";
import { RangePicker } from "@/components/charts/range-picker";
import { formatBDT, formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/analytics");
  const { range: rawRange } = await searchParams;
  const range = ["7", "30", "90", "365"].includes(rawRange ?? "") ? Number(rawRange) : 30;

  const [kpis, revenueSeries, enrollmentSeries, topCourses, methodSplit, topTeachers] = await Promise.all([
    getAdminKpis(range),
    getRevenueSeries(range),
    getEnrollmentSeries(range),
    getTopCourses(range),
    getMethodSplit(range),
    getTopTeachers(range),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Analytics</h1>
          <p className="mt-1 text-sm text-muted-fg">Platform performance over the selected window.</p>
        </div>
        <RangePicker range={String(range)} basePath="/admin/analytics" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatBDT(kpis.revenue)} icon={<CircleDollarSign />} tone="gold" />
        <StatCard label="Orders" value={formatNumber(kpis.orders)} icon={<ShoppingCart />} tone="brand" />
        <StatCard label="New enrollments" value={formatNumber(kpis.enrollments)} icon={<Users />} tone="accent" />
        <StatCard label="New users" value={formatNumber(kpis.newUsers)} icon={<UserPlus />} />
        <StatCard label="Commission" value={formatBDT(kpis.commission)} icon={<Percent />} tone="accent" />
        <StatCard label="Average order" value={formatBDT(kpis.aov)} icon={<TrendingUp />} />
        <StatCard label="Conversion" value={`${kpis.conversion}%`} icon={<TrendingUp />} tone="success" />
        <StatCard label="Refund rate" value={`${kpis.refundRate}%`} icon={<Percent />} tone={kpis.refundRate > 10 ? "success" : "neutral"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Revenue over time */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Completed payments per day</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart data={revenueSeries} money />
          </CardContent>
        </Card>

        {/* Enrollments over time */}
        <Card>
          <CardHeader>
            <CardTitle>Enrollments</CardTitle>
            <CardDescription>New enrollments per day</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={enrollmentSeries} />
          </CardContent>
        </Card>

        {/* Top courses */}
        <Card>
          <CardHeader>
            <CardTitle>Top courses</CardTitle>
            <CardDescription>By revenue in this window</CardDescription>
          </CardHeader>
          <CardContent>
            <HBarList
              rows={topCourses.map((c) => ({
                label: c.title,
                value: c.revenue,
                sub: `${c.students} student${c.students === 1 ? "" : "s"}`,
              }))}
              money
            />
          </CardContent>
        </Card>

        {/* Top teachers */}
        <Card>
          <CardHeader>
            <CardTitle>Top earning teachers</CardTitle>
            <CardDescription>Wallet credits in this window</CardDescription>
          </CardHeader>
          <CardContent>
            <HBarList rows={topTeachers.map((t) => ({ label: t.name, value: t.amount }))} money />
          </CardContent>
        </Card>
      </div>

      {/* Payment methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payments by method</CardTitle>
          <CardDescription>Completed payments only — legend shows exact values</CardDescription>
        </CardHeader>
        <CardContent>
          <DonutChart rows={methodSplit} money />
          {/* Table view for accessibility */}
          <div className="mt-6 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-96 text-left text-[12px]">
              <thead>
                <tr className="border-b border-line text-[10px] font-extrabold uppercase tracking-wide text-faint-fg">
                  <th className="px-4 py-2">Method</th>
                  <th className="px-4 py-2 text-right">Revenue</th>
                  <th className="px-4 py-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {methodSplit.map((m) => (
                  <tr key={m.label}>
                    <td className="px-4 py-2 font-semibold text-foreground">{m.label}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-foreground">{formatBDT(m.value)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-fg">
                      {kpis.revenue > 0 ? `${Math.round((m.value / kpis.revenue) * 100)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
