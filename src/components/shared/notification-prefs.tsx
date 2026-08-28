"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { updateNotificationPreference } from "@/lib/actions/prefs";

const TYPES: { value: string; label: string; description: string }[] = [
  { value: "PAYMENT_SUCCESS", label: "Payment receipts", description: "Receipts for course and booking payments" },
  { value: "BOOKING_ACCEPTED", label: "Booking updates", description: "When teachers accept or decline your bookings" },
  { value: "NEW_MESSAGE", label: "New messages", description: "When someone messages you" },
  { value: "LIVE_CLASS_REMINDER", label: "Class reminders", description: "Reminders for live classes and sessions" },
  { value: "COURSE_COMPLETED", label: "Progress & completion", description: "Course completions, achievements and certificates" },
];

interface Pref {
  type: string;
  inApp: boolean;
  email: boolean;
}

export function NotificationPrefs() {
  const [prefs, setPrefs] = useState<Pref[] | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const raf = requestAnimationFrame(async () => {
      try {
        const res = await fetch("/api/notifications/prefs");
        if (res.ok) setPrefs((await res.json()).prefs);
        else setPrefs([]);
      } catch {
        setPrefs([]);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  function toggle(type: string, key: "inApp" | "email", value: boolean) {
    const current = prefs?.find((p) => p.type === type) ?? { type, inApp: true, email: false };
    setPrefs((prev) =>
      (prev ?? []).map((p) => (p.type === type ? { ...p, [key]: value } : p)),
    );
    startTransition(async () => {
      await updateNotificationPreference(type, {
        inApp: key === "inApp" ? value : current.inApp,
        email: key === "email" ? value : current.email,
      });
      router.refresh();
    });
  }

  if (prefs === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-brand-fg" /> Notifications
          </CardTitle>
          <CardDescription>Choose how you hear from LearnHub.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-brand-fg" /> Notifications
        </CardTitle>
        <CardDescription>
          Email is opt-in per category. In-app notifications are always instant.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-line">
          {TYPES.map((t) => {
            const pref = prefs.find((p) => p.type === t.value) ?? { type: t.value, inApp: true, email: false };
            return (
              <li key={t.value} className="flex flex-wrap items-center gap-3 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-foreground">{t.label}</p>
                  <p className="text-[11px] text-faint-fg">{t.description}</p>
                </div>
                <Toggle
                  label={`${t.label} in-app`}
                  checked={pref.inApp}
                  onChange={(v) => toggle(t.value, "inApp", v)}
                  pending={pending}
                />
                <Toggle
                  label={`${t.label} email`}
                  checked={pref.email}
                  onChange={(v) => toggle(t.value, "email", v)}
                  pending={pending}
                />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

function Toggle({
  label,
  checked,
  onChange,
  pending,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  pending: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={pending}
      onClick={() => onChange(!checked)}
      className={
        checked
          ? "relative h-6 w-11 rounded-full bg-brand transition-colors"
          : "relative h-6 w-11 rounded-full bg-card-2 ring-1 ring-line transition-colors"
      }
    >
      <span
        className={
          checked
            ? "absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-all"
            : "absolute left-1 top-1 h-4 w-4 rounded-full bg-faint-fg transition-all"
        }
      />
    </button>
  );
}
