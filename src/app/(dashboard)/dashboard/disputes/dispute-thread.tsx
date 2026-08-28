"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { disputeMessage } from "@/lib/actions/dispute";

export function DisputeThread({
  disputeId,
  messages,
  closed,
}: {
  disputeId: string;
  messages: { id: string; senderName: string; content: string; createdAt: string }[];
  closed: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function send() {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    startTransition(async () => {
      const r = await disputeMessage(disputeId, content);
      if (r.ok) router.refresh();
      else toast({ title: r.error ?? "Message not sent.", variant: "error" });
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">
        Conversation ({messages.length})
      </p>
      {messages.length === 0 && (
        <p className="text-[12px] text-faint-fg">No messages yet.</p>
      )}
      <div className="space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={cn("rounded-xl bg-card-2 p-3")}>
            <p className="text-[11px] font-bold text-faint-fg">
              {m.senderName} · {formatDateTime(m.createdAt)}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground">{m.content}</p>
          </div>
        ))}
      </div>
      {!closed && (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Add a message…"
            className="h-9 flex-1"
          />
          <Button size="icon" loading={pending} onClick={send} aria-label="Send message">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
