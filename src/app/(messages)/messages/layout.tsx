import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="glass flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <Logo size="sm" />
        <Link
          href={user.role === "TEACHER" ? "/teacher" : "/dashboard"}
          className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-fg transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
      </header>
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
