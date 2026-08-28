"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password"));
    const confirm = String(form.get("confirm"));
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? "Reset failed. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-extrabold text-foreground">Password reset!</h1>
          <p className="text-sm text-muted-fg">You can now sign in with your new password.</p>
        </div>
        <Button href="/login" className="w-full">
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-display text-2xl font-extrabold text-foreground">Set a new password</h1>
        <p className="text-sm text-muted-fg">Choose a strong password you don&apos;t use elsewhere</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="New password"
          type="password"
          name="password"
          placeholder="At least 8 characters with a number"
          autoComplete="new-password"
          hint="Minimum 8 characters, must include a letter and a number."
          required
        />
        <Input
          label="Confirm new password"
          type="password"
          name="confirm"
          placeholder="Repeat your new password"
          autoComplete="new-password"
          required
        />
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Reset password
        </Button>
      </form>

      <p className="text-center text-[13px] text-muted-fg">
        <Link href="/login" className="font-bold text-brand-fg hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
