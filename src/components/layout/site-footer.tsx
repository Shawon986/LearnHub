import Link from "next/link";
import { Logo } from "@/components/layout/logo";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { label: "All courses", href: "/#courses" },
      { label: "Find teachers", href: "/#teachers" },
      { label: "Live classes", href: "/#live" },
      { label: "Recorded classes", href: "/#recorded" },
      { label: "AI learning", href: "/#ai" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Why LearnHub", href: "/#why" },
      { label: "Pricing & commission", href: "/#pricing" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Teach",
    links: [
      { label: "Become a teacher", href: "/register" },
      { label: "Teacher dashboard", href: "/teacher" },
      { label: "Verification", href: "/#why" },
      { label: "Withdrawals", href: "/teacher/earnings" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help center", href: "/#faq" },
      { label: "Contact us", href: "mailto:support@learnhub.example" },
      { label: "Terms of service", href: "/#pricing" },
      { label: "Privacy policy", href: "/#pricing" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-card">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-6">
          <div className="col-span-2 space-y-4">
            <Logo size="md" />
            <p className="max-w-xs text-[13px] leading-relaxed text-muted-fg">
              Bangladesh&apos;s premium education marketplace — live classes, recorded courses and
              1-on-1 tutoring with verified teachers.
            </p>
            <div className="flex items-center gap-2" aria-label="Payment methods">
              {["bKash", "Nagad", "Rocket", "Stripe"].map((p) => (
                <span
                  key={p}
                  className="rounded-md border border-line bg-card-2 px-2 py-1 text-[10px] font-bold text-muted-fg"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-faint-fg">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] font-medium text-muted-fg transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-[12px] text-faint-fg sm:flex-row">
          <p>© 2026 LearnHub. All rights reserved.</p>
          <p>Made with 💜 in Bangladesh</p>
        </div>
      </div>
    </footer>
  );
}
