"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { startConversation } from "@/lib/actions/messages";

export function MessageButton({ teacherId, teacherName }: { teacherId: string; teacherName: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  return (
    <Button
      variant="secondary"
      className="w-full"
      loading={pending}
      leftIcon={<MessageSquare className="h-4 w-4" />}
      onClick={() =>
        startTransition(async () => {
          const result = await startConversation(teacherId);
          if (!result.ok) {
            toast({ title: result.error, variant: "error" });
          } else {
            router.push(`/messages/${result.conversationId}`);
          }
        })
      }
    >
      Message {teacherName.split(" ")[0]}
    </Button>
  );
}
