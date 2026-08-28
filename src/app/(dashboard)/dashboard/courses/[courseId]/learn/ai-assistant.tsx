"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { assistantSend } from "@/lib/actions/ai";

interface AssistantMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
}

export function AiAssistant({
  courseTitle,
  lessonTitle,
  articleSnippet,
  initialConversationId,
  initialMessages,
}: {
  courseTitle: string;
  lessonTitle: string;
  articleSnippet?: string;
  initialConversationId: string | null;
  initialMessages: AssistantMessage[];
}) {
  const [open, setOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [messages, setMessages] = useState<AssistantMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, open, pending]);

  const context = `Course: ${courseTitle}\nLesson: ${lessonTitle}${
    articleSnippet ? `\nLesson content excerpt:\n${articleSnippet.slice(0, 1500)}` : ""
  }`;

  function send() {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "USER", content }]);
    startTransition(async () => {
      const result = await assistantSend({
        message: content,
        conversationId,
        context,
      });
      if (result.ok) {
        setConversationId(result.conversationId);
        setMessages((prev) => [
          ...prev,
          { id: `ai-${Date.now()}`, role: "ASSISTANT", content: result.reply },
        ]);
      } else {
        toast({ title: result.error ?? "Assistant unavailable.", variant: "error" });
      }
    });
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-accent px-5 py-3 text-[13px] font-bold text-white shadow-glow transition-transform hover:scale-105"
      >
        <Sparkles className="h-4 w-4" /> Ask the AI tutor
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[560px] w-[380px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-lift">
          <div className="flex items-center justify-between bg-gradient-to-r from-brand to-accent px-4 py-3 text-white">
            <p className="flex items-center gap-2 text-[13px] font-bold">
              <Bot className="h-4 w-4" /> AI Study Assistant
            </p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-full p-1 hover:bg-white/15">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="pt-8 text-center">
                <p className="text-[13px] font-bold text-foreground">Stuck on this lesson?</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-fg">
                  Ask anything about &ldquo;{lessonTitle}&rdquo; — the assistant knows this lesson&apos;s context.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {["Explain this in simpler terms", "Give me a practice exercise", "What's the key takeaway?"].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => {
                        setDraft(q);
                      }}
                      className="rounded-full border border-line bg-card-2 px-3 py-1.5 text-[11px] font-bold text-muted-fg transition-colors hover:text-foreground"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={cn("flex gap-2", m.role === "USER" && "flex-row-reverse")}>
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white",
                    m.role === "USER" ? "bg-brand" : "bg-gradient-to-br from-brand to-accent",
                  )}
                >
                  {m.role === "USER" ? "You" : <Bot className="h-3.5 w-3.5" />}
                </span>
                <div
                  className={cn(
                    "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    m.role === "USER" ? "bg-brand text-white" : "bg-card-2 text-foreground",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {pending && (
              <div className="flex items-center gap-2 text-[12px] text-faint-fg">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 border-t border-line p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about this lesson…"
              aria-label="Ask the AI tutor"
              className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-card px-3.5 text-[13px] placeholder:text-faint-fg focus:border-brand focus:outline-none"
            />
            <Button size="icon" onClick={send} disabled={!draft.trim()} aria-label="Send question">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
