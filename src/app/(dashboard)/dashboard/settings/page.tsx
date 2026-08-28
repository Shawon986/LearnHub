import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/utils";
import { SettingsForms } from "./settings-forms";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/settings");

  const profile = await db.studentProfile.findUnique({ where: { userId: user.id } });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-extrabold text-foreground">Settings</h1>
          <p className="mt-1 text-sm text-muted-fg">Manage your profile and account security.</p>
        </div>
        <Badge variant={user.emailVerified ? "success" : "gold"}>
          {user.emailVerified ? "Email verified" : "Email unverified"}
        </Badge>
      </div>

      <SettingsForms
        initial={{
          name: user.name,
          phone: user.phone ?? "",
          bio: user.bio ?? "",
          headline: profile?.headline ?? "",
          interests: safeJsonParse<string[]>(profile?.interests, []),
          email: user.email,
          referralCode: user.referralCode,
        }}
      />
    </div>
  );
}
