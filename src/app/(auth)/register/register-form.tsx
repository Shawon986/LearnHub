"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, GraduationCap, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Role = "STUDENT" | "TEACHER";

export function RegisterForm() {
  const [role, setRole] = useState<Role>("STUDENT");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState<{ email: string; devVerificationUrl?: string } | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setFormError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
          role,
          referralCode: form.get("referralCode") || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.error?.details?.[0]?.message;
        setFormError(detail ?? data.error?.message ?? "Registration failed. Please try again.");
        return;
      }
      setDone({ email: data.email, devVerificationUrl: data.devVerificationUrl });
    } catch {
      setFormError("Something went wrong. Please try again.");
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
          <h1 className="font-display text-2xl font-extrabold text-foreground">Account created!</h1>
          <p className="text-sm leading-relaxed text-muted-fg">
            We sent a verification link to <strong className="text-foreground">{done.email}</strong>.
            Verify your email to activate your account.
          </p>
        </div>
        {done.devVerificationUrl && (
          <div className="rounded-xl border border-gold/30 bg-gold-soft p-3.5 text-left">
            <p className="text-xs font-bold uppercase tracking-wide text-gold">Development mode</p>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground">
              Email delivery is set to console. Open the verification link directly:
            </p>
            <a
              href={done.devVerificationUrl}
              className="mt-2 inline-block text-[13px] font-bold text-brand-fg underline"
            >
              Verify my email now →
            </a>
          </div>
        )}
        <Button href="/login" variant="secondary" className="w-full">
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-display text-2xl font-extrabold text-foreground">Create your account</h1>
        <p className="text-sm text-muted-fg">Join thousands of learners and teachers in Bangladesh</p>
      </div>

      {/* Role selection */}
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="I want to join as">
        {(
          [
            { value: "STUDENT", label: "I want to learn", icon: BookOpen },
            { value: "TEACHER", label: "I want to teach", icon: GraduationCap },
          ] as const
        ).map((r) => (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={role === r.value}
            onClick={() => setRole(r.value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 transition-all duration-200",
              role === r.value
                ? "border-brand bg-brand-soft shadow-glow"
                : "border-line bg-card hover:border-line-strong hover:shadow-soft",
            )}
          >
            <r.icon className={cn("h-5 w-5", role === r.value ? "text-brand-fg" : "text-muted-fg")} />
            <span className={cn("text-[13px] font-bold", role === r.value ? "text-brand-fg" : "text-foreground")}>
              {r.label}
            </span>
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input label="Full name" name="name" placeholder="e.g. Shawon Ahmed" autoComplete="name" leftIcon={<User />} required />
        <Input label="Email" type="email" name="email" placeholder="you@example.com" autoComplete="email" leftIcon={<Mail />} required />
        <Input
          label="Password"
          type="password"
          name="password"
          placeholder="At least 8 characters with a number"
          autoComplete="new-password"
          hint="Minimum 8 characters, must include a letter and a number."
          required
        />
        <Input
          label="Referral code (optional)"
          name="referralCode"
          placeholder="LEARN-XXXX-000"
          autoCapitalize="characters"
        />

        {formError && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" loading={loading} className="w-full">
          {role === "TEACHER" ? "Create teacher account" : "Create student account"}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-faint-fg">
          By continuing you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>

      <p className="text-center text-[13px] text-muted-fg">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-brand-fg hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
