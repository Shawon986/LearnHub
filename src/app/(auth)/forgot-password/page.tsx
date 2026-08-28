"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email") }),
      });
      if (!res.ok) throw new Error("Request failed");
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="space-y-1.5">
          <h1 className="font-display text-2xl font-extrabold text-foreground">Check your inbox</h1>
          <p className="text-sm leading-relaxed text-muted-fg">
            If an account exists for that email, we&apos;ve sent a password reset link. It expires in 1 hour.
          </p>
        </div>
        <Button href="/login" variant="secondary" className="w-full">
          Back to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-display text-2xl font-extrabold text-foreground">Forgot password?</h1>
        <p className="text-sm text-muted-fg">Enter your email and we&apos;ll send you a reset link</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input label="Email" type="email" name="email" placeholder="you@example.com" autoComplete="email" leftIcon={<Mail />} required />
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" loading={loading} className="w-full">
          Send reset link
        </Button>
      </form>

      <p className="text-center text-[13px] text-muted-fg">
        Remembered it?{" "}
        <Link href="/login" className="font-bold text-brand-fg hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
