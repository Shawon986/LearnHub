import type { Metadata } from "next";
import { CheckCircle2, CircleX } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let ok = false;
  if (token) {
    const record = await db.authToken.findUnique({ where: { token } });
    if (
      record &&
      record.type === "EMAIL_VERIFY" &&
      !record.usedAt &&
      record.expiresAt > new Date()
    ) {
      await db.$transaction([
        db.user.update({
          where: { id: record.userId },
          data: { emailVerified: new Date() },
        }),
        db.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      ]);
      ok = true;
    }
  }

  return (
    <div className="bg-brand-surface flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="space-y-6 rounded-2xl border border-line bg-card p-8 text-center shadow-lift">
          {ok ? (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h1 className="font-display text-2xl font-extrabold text-foreground">
                  Email verified!
                </h1>
                <p className="text-sm leading-relaxed text-muted-fg">
                  Your account is now active. Sign in to start learning or teaching.
                </p>
              </div>
              <Button href="/login" size="lg" className="w-full">
                Continue to sign in
              </Button>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-soft text-danger">
                <CircleX className="h-8 w-8" />
              </div>
              <div className="space-y-1.5">
                <h1 className="font-display text-2xl font-extrabold text-foreground">
                  Link invalid or expired
                </h1>
                <p className="text-sm leading-relaxed text-muted-fg">
                  This verification link is invalid or has expired. You can request a new one from
                  the sign-in page.
                </p>
              </div>
              <Button href="/login" variant="secondary" className="w-full">
                Back to sign in
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
