"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CaptchaField } from "@/components/auth/captcha-field";
import { useToast } from "@/components/ui/toast";
import { homeFor } from "@/lib/nav";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [captchaRefresh, setCaptchaRefresh] = useState(0);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    setFormError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          captchaId: form.get("captchaId"),
          captchaAnswer: form.get("captchaAnswer"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error?.message ?? "Sign in failed. Please try again.");
        // A consumed challenge can't be retried — fetch a fresh one.
        setCaptchaRefresh((k) => k + 1);
        return;
      }
      toast({ title: "Welcome back!", description: `Signed in as ${data.user.name}.`, variant: "success" });
      const next = searchParams.get("next");
      router.push(next && next.startsWith("/") ? next : homeFor(data.user.role));
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-display text-2xl font-extrabold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted-fg">Sign in to continue your learning journey</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          name="email"
          placeholder="you@example.com"
          autoComplete="email"
          leftIcon={<Mail />}
          required
        />
        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          name="password"
          placeholder="••••••••"
          autoComplete="current-password"
          leftIcon={<Lock />}
          required
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="rounded-full p-1.5 text-faint-fg transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <CaptchaField refreshKey={captchaRefresh} />

        {formError && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            {formError}
          </p>
        )}

        <div className="flex items-center justify-between text-[13px]">
          <label className="inline-flex cursor-pointer items-center gap-2 text-muted-fg">
            <input type="checkbox" name="remember" className="h-3.5 w-3.5 rounded border-line accent-[var(--brand)]" />
            Remember me
          </label>
          <Link href="/forgot-password" className="font-semibold text-brand-fg hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>

      <p className="text-center text-[13px] text-muted-fg">
        New to LearnHub?{" "}
        <Link href="/register" className="font-bold text-brand-fg hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
