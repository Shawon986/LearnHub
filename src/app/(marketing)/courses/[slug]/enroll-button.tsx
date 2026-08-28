"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { enrollFree } from "@/lib/actions/enroll";

export function EnrollButton({
  courseId,
  price,
  enrolled,
  hasSession,
}: {
  courseId: string;
  price: number;
  enrolled: boolean;
  hasSession: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  if (enrolled) {
    return (
      <Button href={`/dashboard/courses/${courseId}/learn`} className="w-full" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
        Continue learning
      </Button>
    );
  }

  if (price > 0) {
    return (
      <div className="space-y-2">
        <Button className="w-full" size="lg" disabled leftIcon={<Lock className="h-4 w-4" />}>
          Enroll now
        </Button>
        <p className="text-center text-[11px] font-semibold text-faint-fg">
          Payments (bKash · Nagad · Rocket · Stripe) arrive in Phase 6
        </p>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <Button href={`/login?next=/courses/${courseId}`} className="w-full" size="lg">
        Sign in to enroll
      </Button>
    );
  }

  return (
    <Button
      className="w-full"
      size="lg"
      loading={pending}
      leftIcon={<Sparkles className="h-4 w-4" />}
      onClick={() => {
        startTransition(async () => {
          const result = await enrollFree(courseId);
          if (result.ok) {
            toast({ title: "Enrolled! 🎉", description: "You can start learning right away.", variant: "success" });
            router.push(`/dashboard/courses/${courseId}/learn`);
            router.refresh();
          } else {
            toast({ title: result.error ?? "Could not enroll.", variant: "error" });
          }
        });
      }}
    >
      Enroll for free
    </Button>
  );
}
