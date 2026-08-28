import { cn, gradientFor, initialsOf } from "@/lib/utils";

const SIZES = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
} as const;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
  /** Online/presence dot */
  status?: "online" | "offline";
}

export function Avatar({ name, src, size = "md", className, status }: AvatarProps) {
  return (
    <span className={cn("relative inline-block shrink-0", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          className={cn(
            "rounded-full object-cover ring-1 ring-line",
            SIZES[size],
          )}
        />
      ) : (
        <span
          className={cn(
            "flex items-center justify-center rounded-full bg-gradient-to-br font-bold text-white ring-1 ring-line",
            SIZES[size],
            gradientFor(name),
          )}
          aria-hidden
        >
          {initialsOf(name)}
        </span>
      )}
      {status && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-card",
            status === "online" ? "bg-success" : "bg-faint-fg",
          )}
          aria-label={status}
        />
      )}
    </span>
  );
}
