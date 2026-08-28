import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Link2, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeacherPasswordForm } from "./teacher-password-form";
import { CopyCodeButton } from "./copy-code-button";

export const metadata: Metadata = { title: "Settings" };

export default async function TeacherSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/teacher/settings");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-fg">Account security and identity.</p>
        </div>
        <Badge variant={user.emailVerified ? "success" : "gold"}>
          {user.emailVerified ? "Email verified" : "Email unverified"}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your identity on LearnHub.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-card-2 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-faint-fg">Email</p>
              <p className="mt-0.5 font-semibold text-foreground">{user.email}</p>
            </div>
            <Badge variant="neutral">{user.role}</Badge>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-card-2 p-4">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-faint-fg">
                <ShieldCheck className="h-3.5 w-3.5" /> Referral code
              </p>
              <p className="mt-0.5 flex items-center gap-2 font-mono text-sm font-bold text-foreground">
                <Link2 className="h-3.5 w-3.5 text-accent" />
                {user.referralCode}
              </p>
            </div>
            <CopyCodeButton code={user.referralCode} />
          </div>
        </CardContent>
      </Card>

      <TeacherPasswordForm />
    </div>
  );
}
