"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Link2 } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateProfile, changePassword } from "@/lib/actions/student";
import { NotificationPrefs } from "@/components/shared/notification-prefs";

interface SettingsFormsProps {
  initial: {
    name: string;
    phone: string;
    bio: string;
    headline: string;
    interests: string[];
    email: string;
    referralCode: string;
  };
}

export function SettingsForms({ initial }: SettingsFormsProps) {
  const [tab, setTab] = useState("profile");
  const router = useRouter();
  const { toast } = useToast();

  return (
    <>
      <Tabs
        value={tab}
        onChange={setTab}
        variant="segmented"
        tabs={[
          { value: "profile", label: "Profile" },
          { value: "password", label: "Password" },
          { value: "notifications", label: "Notifications" },
        ]}
      />

      {tab === "profile" && (
        <ProfileForm
          initial={initial}
          onSaved={() => {
            toast({ title: "Profile updated", variant: "success" });
            router.refresh();
          }}
        />
      )}
      {tab === "password" && <PasswordForm />}
      {tab === "notifications" && <NotificationPrefs />}

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your account identity on LearnHub.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-card-2 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-faint-fg">Email</p>
              <p className="mt-0.5 font-semibold text-foreground">{initial.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-card-2 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-faint-fg">Referral code</p>
              <p className="mt-0.5 flex items-center gap-2 font-mono text-sm font-bold text-foreground">
                <Link2 className="h-3.5 w-3.5 text-accent" />
                {initial.referralCode}
              </p>
              <p className="mt-1 text-xs text-faint-fg">
                Share it — you earn ৳100 when a friend makes their first purchase.
              </p>
            </div>
            <CopyButton text={initial.referralCode} />
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </Button>
  );
}

function ProfileForm({ initial, onSaved }: { initial: SettingsFormsProps["initial"]; onSaved: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const interests = String(form.get("interests") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setError(null);
    startTransition(async () => {
      const result = await updateProfile({
        name: String(form.get("name")),
        phone: String(form.get("phone") ?? ""),
        bio: String(form.get("bio") ?? ""),
        headline: String(form.get("headline") ?? ""),
        interests,
      });
      if (result.ok) onSaved();
      else setError(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>This information appears on your public profile.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" name="name" defaultValue={initial.name} required />
            <Input label="Phone" name="phone" defaultValue={initial.phone} placeholder="+880 1XXX-XXXXXX" />
          </div>
          <Input
            label="Headline"
            name="headline"
            defaultValue={initial.headline}
            placeholder="e.g. Aspiring full-stack developer"
            hint="A short line shown on your profile."
          />
          <Input
            label="Interests"
            name="interests"
            defaultValue={initial.interests.join(", ")}
            placeholder="Web Development, Data Science, Design"
            hint="Comma-separated — powers your recommendations."
          />
          <Textarea
            label="Bio"
            name="bio"
            defaultValue={initial.bio}
            placeholder="Tell teachers a little about yourself…"
            rows={4}
          />
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" loading={pending}>
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const next = String(form.get("newPassword"));
    if (next !== String(form.get("confirmPassword"))) {
      setError("New passwords do not match.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await changePassword({
        currentPassword: String(form.get("currentPassword")),
        newPassword: next,
      });
      if (result.ok) {
        toast({ title: "Password changed", description: "Use your new password next time you sign in.", variant: "success" });
        (e.target as HTMLFormElement).reset();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Minimum 8 characters with a letter and a number.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input label="Current password" type="password" name="currentPassword" autoComplete="current-password" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="New password" type="password" name="newPassword" autoComplete="new-password" required />
            <Input label="Confirm new password" type="password" name="confirmPassword" autoComplete="new-password" required />
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end">
            <Button type="submit" loading={pending} variant="secondary">
              Update password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
