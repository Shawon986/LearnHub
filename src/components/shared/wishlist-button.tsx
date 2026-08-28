"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { toggleWishlist } from "@/lib/actions/wishlist";

export function WishlistButton({
  type,
  targetId,
  initialSaved,
  className,
  label,
}: {
  type: "COURSE" | "TEACHER";
  targetId: string;
  initialSaved: boolean;
  className?: string;
  /** Show a text label next to the heart. */
  label?: string;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={initialSaved}
      aria-label={initialSaved ? "Remove from wishlist" : "Save to wishlist"}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleWishlist(type, targetId);
          if (result.ok) {
            toast({
              title: initialSaved ? "Removed from wishlist" : "Saved to wishlist ❤️",
              description: initialSaved
                ? undefined
                : "You'll get a notification if the price drops.",
              variant: "success",
            });
            router.refresh();
          } else {
            toast({ title: result.error ?? "Could not update wishlist.", variant: "error" });
          }
        })
      }
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full p-2 text-faint-fg transition-all",
        initialSaved && "text-danger",
        "hover:bg-danger-soft hover:text-danger active:scale-95",
        className,
      )}
    >
      <Heart
        className={cn("h-[18px] w-[18px] transition-transform group-hover:scale-110", initialSaved && "fill-current")}
      />
      {label && <span className="text-[12px] font-bold">{label}</span>}
    </button>
  );
}
