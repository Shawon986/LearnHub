"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, GraduationCap, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CaptchaField } from "@/components/auth/captcha-field";
import { cn } from "@/lib/utils";

type Role = "STUDENT" | "TEACHER";

export function RegisterForm({ initialReferralCode }: { initialReferralCode?: string }) {
  const [role, setRole] = useState<Role>("STUDENT");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [captchaRefresh, setCaptchaRefresh] = useState(0);
  const [done, setDone] = useState<{ email: string; devVerificationUrl?: string } | null>(null);
  const [documents, setDocuments] = useState<{ type: string; title: string; url: string }[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  async function uploadDocument(file: File, type: string, title: string) {
    setUploading(type);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/verification/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message ?? "Upload failed. Please try again.");
        return;
      }
      setDocuments((prev) => [...prev.filter((d) => d.type !== type), { type, title, url: data.path }]);
    } catch {
      setFormError("Upload failed — check your connection and try again.");
    } finally {
      setUploading(null);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (role === "TEACHER") {
      const hasNid = documents.some((d) => d.type === "ID_CARD");
      const hasResume = documents.some((d) => d.type === "RESUME");
      if (!hasNid || !hasResume) {
        setFormError("Teachers must upload a NID card and a resume/CV before registering.");
        return;
      }
    }
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
          documents: role === "TEACHER" ? documents : undefined,
          captchaId: form.get("captchaId"),
          captchaAnswer: form.get("captchaAnswer"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.error?.details?.[0]?.message;
        setFormError(detail ?? data.error?.message ?? "Registration failed. Please try again.");
        setCaptchaRefresh((k) => k + 1);
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
          defaultValue={initialReferralCode}
          autoCapitalize="characters"
        />
        {role === "TEACHER" && (
          <div className="space-y-3 rounded-xl border border-line bg-card-2/40 p-4">
            <div>
              <p className="text-[13px] font-bold text-foreground">Verification documents</p>
              <p className="text-[11px] leading-relaxed text-muted-fg">
                Upload your NID card and resume/CV to apply. An admin reviews these before you can
                sign in. PDF, JPG or PNG · max 10 MB each.
              </p>
            </div>
            {(
              [
                { type: "ID_CARD", label: "NID card (required)", accept: ".pdf,.jpg,.jpeg,.png,.webp" },
                { type: "RESUME", label: "Resume / CV (required)", accept: ".pdf,.jpg,.jpeg,.png,.webp" },
                { type: "EDUCATION", label: "Educational documents (optional)", accept: ".pdf,.jpg,.jpeg,.png,.webp" },
                { type: "PHOTO", label: "Profile photo (optional)", accept: ".jpg,.jpeg,.png,.webp" },
              ] as const
            ).map((d) => {
              const uploaded = documents.find((x) => x.type === d.type);
              return (
                <div key={d.type} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-muted-fg">{d.label}</p>
                    {uploaded ? (
                      <p className="truncate text-[11px] font-bold text-success">✓ Uploaded</p>
                    ) : (
                      <p className="text-[11px] text-faint-fg">{uploading === d.type ? "Uploading…" : "Not uploaded"}</p>
                    )}
                  </div>
                  <label className="cursor-pointer rounded-lg border border-line bg-card px-3 py-1.5 text-[11px] font-bold text-foreground transition-colors hover:border-brand">
                    {uploaded ? "Replace" : "Upload"}
                    <input
                      type="file"
                      className="hidden"
                      accept={d.accept}
                      disabled={uploading !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void uploadDocument(file, d.type, d.label);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              );
            })}
            <p className="text-[11px] leading-relaxed text-faint-fg">
              Your account stays locked until an admin approves your documents — you&apos;ll be able to
              sign in right after.
            </p>
          </div>
        )}

        <CaptchaField refreshKey={captchaRefresh} />

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
