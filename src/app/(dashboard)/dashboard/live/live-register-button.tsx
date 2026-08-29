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
          toast({ title: "Registered 🎉", description: "The meeting link is in your notification.", variant: "success" });
          router.refresh();
        })
      }
    >
      Register
    </Button>
  );
}
