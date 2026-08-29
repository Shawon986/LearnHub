import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-brand-surface min-h-screen">
      <header className="border-b border-line bg-card/70 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Logo animated={false} size="md" />
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-muted-fg">
            <ShieldCheck className="h-4 w-4 text-accent" />
            Secure checkout
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">{children}</main>
      <footer className="pb-10 text-center text-[11px] text-faint-fg">
        <Link href="/" className="hover:text-foreground">
          ← Back to LearnHub
        </Link>
        <p className="mt-2">Payments are verified server-side. Your details are encrypted in transit.</p>
      </footer>
    </div>
  );
}
