import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Search, Users } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { UserRowActions } from "./user-row-actions";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };

const ROLE_VARIANT: Record<string, "brand" | "accent" | "gold" | "neutral" | "danger"> = {
  STUDENT: "neutral",
  TEACHER: "accent",
  ADMIN: "brand",
  MODERATOR: "gold",
  SUPPORT: "gold",
  SUPER_ADMIN: "danger",
};

const STATUS_VARIANT: Record<string, "success" | "gold" | "danger"> = {
  ACTIVE: "success",
  SUSPENDED: "gold",
  BANNED: "danger",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/users");
  const { q, role, status } = await searchParams;

  const users = await db.user.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q } },
                { email: { contains: q } },
              ],
            }
          : {},
        role ? { role } : {},
        status ? { status } : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Users</h1>
          <p className="mt-1 text-sm text-muted-fg">{users.length} users shown. Actions are audit-logged.</p>
        </div>

        <form className="flex flex-wrap gap-2" method="GET">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint-fg" />
            <input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search name or email…"
              className="h-9 w-56 rounded-xl border border-line bg-card pl-9 pr-3 text-[13px] shadow-soft placeholder:text-faint-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            />
          </div>
          <select
            name="role"
            defaultValue={role ?? ""}
            className="h-9 rounded-xl border border-line bg-card px-3 text-[13px] shadow-soft focus:border-brand focus:outline-none"
          >
            <option value="">All roles</option>
            {["STUDENT", "TEACHER", "ADMIN", "MODERATOR", "SUPPORT", "SUPER_ADMIN"].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-9 rounded-xl border border-line bg-card px-3 text-[13px] shadow-soft focus:border-brand focus:outline-none"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="BANNED">Banned</option>
          </select>
          <button type="submit" className="h-9 rounded-xl bg-brand px-4 text-[13px] font-bold text-white transition-colors hover:bg-brand-hover">
            Filter
          </button>
        </form>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={<Users />} title="No users match" description="Try a different search or filter." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-175 text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">
                <th className="px-5 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="hidden px-4 py-3 md:table-cell">Email</th>
                <th className="hidden px-4 py-3 lg:table-cell">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-card-2/50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                      <span className="text-[13px] font-bold text-foreground">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_VARIANT[u.role] ?? "neutral"}>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_VARIANT[u.status] ?? "neutral"}>{u.status}</Badge>
                  </td>
                  <td className="hidden px-4 py-3 text-[12px] text-muted-fg md:table-cell">{u.email}</td>
                  <td className="hidden px-4 py-3 text-[12px] text-muted-fg lg:table-cell">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <UserRowActions
                      targetId={u.id}
                      targetName={u.name}
                      targetRole={u.role}
                      targetStatus={u.status}
                      actorRole={actor.role}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
