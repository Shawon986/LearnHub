"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { registerLiveClass } from "@/lib/actions/student";

export function LiveRegisterButton({ liveClassId }: { liveClassId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  return (
    <Button
      size="sm"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await registerLiveClass(liveClassId);
          if (!result.ok) {
            toast({ title: result.error ?? "Could not register.", variant: "error" });
            return;
          }
          if (result.paid && result.redirectUrl) {
            toast({ title: "This class requires payment", description: "Complete checkout to reserve your seat.", variant: "info" });
            router.push(result.redirectUrl);
          } else {
            toast({ title: "Registered 🎉", description: "You'll get a reminder before the class.", variant: "success" });
            router.refresh();
          }
        })
      }
    >
      Register
    </Button>
  );
}
