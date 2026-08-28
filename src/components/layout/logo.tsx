import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  size = "md",
  withText = true,
  className,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: { box: "h-7 w-7 rounded-lg", icon: "h-4 w-4", text: "text-base" },
    md: { box: "h-9 w-9 rounded-xl", icon: "h-5 w-5", text: "text-lg" },
    lg: { box: "h-11 w-11 rounded-xl", icon: "h-6 w-6", text: "text-xl" },
  }[size];

  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-brand to-accent text-white shadow-glow",
          sizes.box,
        )}
      >
        <GraduationCap className={sizes.icon} aria-hidden />
      </span>
      {withText && (
        <span className={cn("font-display font-extrabold tracking-tight text-foreground", sizes.text)}>
          Learn<span className="text-gradient">Hub</span>
        </span>
      )}
    </Link>
  );
}
