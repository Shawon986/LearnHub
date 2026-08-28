"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, MessageSquare, Search, Send } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { timeAgo, formatTime } from "@/lib/format";
import { markConversationRead, sendMessage, sendTyping } from "@/lib/actions/messages";
import { uploadChatImage } from "@/lib/actions/uploads";

export interface ConversationData {
  id: string;
  otherUserId: string;
  otherName: string;
  otherAvatarUrl: string | null;
  otherRole: string;
  lastContent: string;
  lastAt: string;
  lastFromMe: boolean;
  unread: number;
}

export interface ThreadData {
  conversationId: string;
  otherName: string;
  otherAvatarUrl: string | null;
  messages: {
    id: string;
    senderId: string;
    content: string;
    type: string;
    attachmentUrl: string | null;
    createdAt: string;
  }[];
}

interface BusMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  attachmentUrl: string | null;
  messageType: string;
  createdAt: string;
}

export function MessagingClient({
  initialConversations,
  initialThread,
  currentUserId,
}: {
  initialConversations: ConversationData[];
  initialThread: ThreadData;
  currentUserId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [conversations, setConversations] = useState<ConversationData[]>(initialConversations);
  const [threadMessages, setThreadMessages] = useState(initialThread.messages);
  const [activeId, setActiveId] = useState(initialThread.conversationId || "");
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [otherUserId, setOtherUserId] = useState<string>("");
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Determine the other party (needed for presence + read receipts).
  useEffect(() => {
    if (!activeId) return;
    fetch(`/api/messages/partner?conversation=${activeId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.userId) setOtherUserId(d.userId);
      })
      .catch(() => {});
  }, [activeId]);

  /* ---- Realtime stream ---- */
  useEffect(() => {
    const es = new EventSource("/api/messages/stream");

    const handle = (raw: string) => {
      let event: BusMessage & { type?: string; userId?: string; online?: boolean };
      try {
        event = JSON.parse(raw);
      } catch {
        return;
      }

      if (event.type === "typing") {
        setTypingUsers((prev) => new Map(prev).set(event.userId!, event.conversationId));
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(
          () => setTypingUsers((prev) => new Map(prev)),
          2500,
        );
        return;
      }
      if (event.type === "presence") {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          if (event.online) next.add(event.userId!);
          else next.delete(event.userId!);
          return next;
        });
        return;
      }
      // "message"
      const msg = event as BusMessage;
      setConversations((prev) => {
        const next = [...prev];
        const idx = next.findIndex((c) => c.id === msg.conversationId);
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            lastContent: msg.messageType === "IMAGE" ? "📷 Image" : msg.content,
            lastAt: msg.createdAt,
            lastFromMe: msg.senderId === currentUserId,
            unread: msg.conversationId === activeId ? 0 : next[idx].unread + (msg.senderId === currentUserId ? 0 : 1),
          };
          next.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
        }
        return next;
      });
      if (msg.conversationId === activeId) {
        setThreadMessages((prev) => [...prev, { id: msg.id, senderId: msg.senderId, content: msg.content, type: msg.messageType, attachmentUrl: msg.attachmentUrl, createdAt: msg.createdAt }]);
        if (msg.senderId !== currentUserId) {
          markConversationRead(activeId).catch(() => {});
        }
      }
    };

    es.onmessage = (m) => {
      if (m.data.startsWith(":")) return;
      handle(m.data);
    };
    return () => es.close();
  }, [activeId, currentUserId]);

  // Scroll to bottom on new messages.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages.length]);

  function open(id: string) {
    setActiveId(id);
    setThreadMessages([]);
    router.push(`/messages/${id}`);
    startTransition(() => {
      markConversationRead(id).catch(() => {});
    });
  }

  function send() {
    const content = draft.trim();
    if (!content || !activeId) return;
    setDraft("");
    startTransition(async () => {
      const result = await sendMessage(activeId, { content });
      if (!result.ok) toast({ title: result.error ?? "Message not sent.", variant: "error" });
    });
  }

  function onTyping() {
    if (!activeId) return;
    // Throttle typing events to once per 1.5s.
    if (typingTimer.current) return;
    typingTimer.current = setTimeout(() => {
      typingTimer.current = null;
    }, 1500);
    sendTyping(activeId).catch(() => {});
  }

  async function attachImage(file: File) {
    setAttachmentUploading(true);
    try {
      const result = await uploadChatImage(file);
      if (!result.ok) {
        toast({ title: result.error, variant: "error" });
        return;
      }
      startTransition(async () => {
        const sent = await sendMessage(activeId, {
          content: "📷 Image",
          attachmentUrl: result.path,
          messageType: "IMAGE",
        });
        if (!sent.ok) toast({ title: sent.error ?? "Message not sent.", variant: "error" });
      });
    } finally {
      setAttachmentUploading(false);
    }
  }

  const filtered = conversations.filter((c) =>
    c.otherName.toLowerCase().includes(filter.toLowerCase()),
  );

  const typingName = [...typingUsers.entries()].find(([, cid]) => cid === activeId)?.[0];
  const isOtherTyping = typingName && typingName !== currentUserId;

  return (
    <div className="mx-auto flex h-full max-w-6xl overflow-hidden border-x border-line bg-card">
      {/* Conversation list */}
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-r border-line sm:w-80",
          activeId && "hidden sm:flex",
        )}
      >
        <div className="border-b border-line p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint-fg" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search conversations…"
              className="h-9 w-full rounded-xl border border-line bg-card pl-9 pr-3 text-[13px] placeholder:text-faint-fg focus:border-brand focus:outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6">
              <EmptyState
                compact
                icon={<MessageSquare />}
                title="No conversations"
                description="Message a teacher from their profile to start one."
              />
            </div>
          ) : (
            <ul>
              {filtered.map((c) => {
                const online = onlineUsers.has(c.otherUserId);
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => open(c.id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-card-2/60",
                        activeId === c.id && "bg-brand-soft/50",
                      )}
                    >
                      <Avatar name={c.otherName} src={c.otherAvatarUrl} size="sm" status={online ? "online" : undefined} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[13px] font-bold text-foreground">{c.otherName}</p>
                          <span className="shrink-0 text-[10px] text-faint-fg">{timeAgo(c.lastAt)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("truncate text-[12px]", c.unread > 0 ? "font-bold text-foreground" : "text-faint-fg")}>
                            {c.lastFromMe && "You: "}
                            {c.lastContent}
                          </p>
                          {c.unread > 0 && (
                            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-extrabold text-white">
                              {c.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Thread */}
      <section className={cn("flex min-w-0 flex-1 flex-col", !activeId && "hidden sm:flex")}>
        {!activeId ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={<MessageSquare />}
              title="Select a conversation"
              description="Your messages appear here in real time."
            />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-line px-5 py-3">
              <button type="button" onClick={() => router.push("/messages")} className="text-[12px] font-bold text-brand-fg sm:hidden">
                ← Back
              </button>
              <Avatar name={initialThread.otherName || threadOtherName(conversations, activeId)} src={initialThread.otherAvatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-foreground">
                  {initialThread.otherName || threadOtherName(conversations, activeId)}
                </p>
                <p className="text-[11px] text-faint-fg">
                  {isOtherTyping
                    ? "typing…"
                    : otherUserId && onlineUsers.has(otherUserId)
                      ? "Online"
                      : "Messages are delivered instantly"}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
              {threadMessages.map((m) => {
                const own = m.senderId === currentUserId;
                return (
                  <div key={m.id} className={cn("flex gap-2.5", own && "flex-row-reverse")}>
                    <div className={cn("max-w-[75%] min-w-0", own && "text-right")}>
                      <div
                        className={cn(
                          "inline-block rounded-2xl px-4 py-2.5 text-left text-[13px] leading-relaxed",
                          own ? "bg-brand text-white" : "bg-card-2 text-foreground",
                        )}
                      >
                        {m.type === "IMAGE" && m.attachmentUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/api/uploads/${m.attachmentUrl}`} alt="Attachment" className="max-h-56 rounded-xl" />
                        ) : (
                          m.content
                        )}
                      </div>
                      <p className="mt-1 text-[10px] text-faint-fg">{formatTime(m.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              {threadMessages.length === 0 && (
                <p className="pt-10 text-center text-[12px] text-faint-fg">No messages yet — say hello!</p>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="border-t border-line p-4">
              {isOtherTyping && <p className="mb-1.5 text-[11px] font-bold text-brand-fg">Someone is typing…</p>}
              <div className="flex items-end gap-2">
                <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line text-faint-fg transition-colors hover:text-foreground">
                  {attachmentUploading ? <SpinnerDots /> : <ImagePlus className="h-4 w-4" />}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void attachImage(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                <input
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    onTyping();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Type a message…"
                  aria-label="Message"
                  className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-card px-3.5 text-[13px] placeholder:text-faint-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!draft.trim()}
                  aria-label="Send"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SpinnerDots() {
  return (
    <span className="flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-1 w-1 animate-pulse-soft rounded-full bg-current" />
      ))}
    </span>
  );
}

function threadOtherName(conversations: ConversationData[], id: string): string {
  return conversations.find((c) => c.id === id)?.otherName ?? "";
}
