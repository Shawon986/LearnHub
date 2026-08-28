import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-brand-surface relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-brand/15 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 right-1/5 h-72 w-72 rounded-full bg-accent/15 blur-3xl" aria-hidden />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Logo size="md" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-fg transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
        <div className="rounded-2xl border border-line bg-card p-8 shadow-lift">{children}</div>
      </div>
    </div>
  );
}
