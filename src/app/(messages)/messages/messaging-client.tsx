"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, MessageSquare, Search, Send, ShieldCheck, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { timeAgo, formatTime, formatDate } from "@/lib/format";
import {
  markConversationRead,
  sendMessage,
  sendTyping,
  startConversation,
  startConversationWithAdmin,
} from "@/lib/actions/messages";
import { uploadChatImage } from "@/lib/actions/uploads";
import type { AdminOversightEntry, MessageDirectoryData } from "@/lib/messaging/directory";

export interface ConversationData {
  id: string;
  otherUserId: string;
  otherName: string;
  otherAvatarUrl: string | null;
  otherRole: string;
  /** When the other party last read the thread (drives "Seen"). */
  partnerLastReadAt: string | null;
  lastContent: string;
  lastAt: string;
  lastFromMe: boolean;
  unread: number;
}

export interface ThreadData {
  conversationId: string;
  otherName: string;
  otherAvatarUrl: string | null;
  otherRole: string;
  partnerLastReadAt: string | null;
  /** Sender display names (admin oversight threads show who wrote what). */
  senderNames?: Record<string, string>;
  senderRoles?: Record<string, string>;
  /** Sender avatars — each message shows its author's own photo. */
  senderAvatars?: Record<string, string>;
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

function sameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(iso, today.toISOString())) return "Today";
  if (sameDay(iso, yesterday.toISOString())) return "Yesterday";
  return formatDate(d);
}

function roleLabel(role: string): string {
  if (role === "TEACHER") return "Teacher";
  if (role === "STUDENT") return "Student";
  return role;
}

/** Local blob previews render directly; server files go through /api/uploads. */
function attachmentSrc(url: string | null): string | null {
  if (!url) return null;
  return url.startsWith("blob:") ? url : `/api/uploads/${url}`;
}

export function MessagingClient({
  initialConversations,
  initialThread,
  currentUserId,
  directory = null,
  adminOversight = [],
  readOnly = false,
}: {
  initialConversations: ConversationData[];
  initialThread: ThreadData;
  currentUserId: string;
  /** Contact directory: admins see teachers, everyone else gets support. */
  directory?: MessageDirectoryData | null;
  /** Admin oversight: every teacher ↔ student conversation on the platform. */
  adminOversight?: AdminOversightEntry[];
  /** True when an admin is viewing a conversation they're not part of. */
  readOnly?: boolean;
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
  const [partnerLastReadAt, setPartnerLastReadAt] = useState<string | null>(
    initialThread.partnerLastReadAt,
  );
  const [pendingAttachment, setPendingAttachment] = useState<{ file: File; url: string } | null>(null);
  const [streamState, setStreamState] = useState<"connecting" | "live" | "reconnecting">("connecting");
  const seenIds = useRef<Set<string>>(new Set());
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  // Two separate timers: one throttles outgoing typing events, the other
  // clears the incoming indicator — sharing a ref made them clobber each other.
  const typingThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
      let event: BusMessage & { type?: string; userId?: string; online?: boolean; at?: string };
      try {
        event = JSON.parse(raw);
      } catch {
        return;
      }

      if (event.type === "typing") {
        setTypingUsers((prev) => new Map(prev).set(event.userId!, event.conversationId));
        if (typingClearRef.current) clearTimeout(typingClearRef.current);
        typingClearRef.current = setTimeout(
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
      if (event.type === "conversation.read") {
        if (event.conversationId === activeId) setPartnerLastReadAt(event.at ?? new Date().toISOString());
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
        // Idempotency: never append the same message twice (reconnect races).
        if (seenIds.current.has(msg.id)) return;
        seenIds.current.add(msg.id);
        setThreadMessages((prev) => {
          // Replace the optimistic row with the confirmed message.
          const withoutTemp =
            msg.senderId === currentUserId ? prev.filter((m) => !m.id.startsWith("local-")) : prev;
          if (withoutTemp.some((m) => m.id === msg.id)) return withoutTemp;
          return [
            ...withoutTemp,
            {
              id: msg.id,
              senderId: msg.senderId,
              content: msg.content,
              type: msg.messageType,
              attachmentUrl: msg.attachmentUrl,
              createdAt: msg.createdAt,
            },
          ];
        });
        if (msg.senderId !== currentUserId) {
          markConversationRead(activeId).catch(() => {});
        }
      }
    };

    es.onmessage = (m) => {
      if (m.data.startsWith(":")) return;
      handle(m.data);
    };
    es.onopen = () => {
      setStreamState("live");
      // After a reconnect, refetch so nothing published during the gap is lost.
      if (streamState !== "connecting") router.refresh();
    };
    es.onerror = () => setStreamState("reconnecting");
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, currentUserId]);

  // Scroll to bottom on new messages.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [threadMessages.length]);

  // Escape closes the image lightbox.
  useEffect(() => {
    if (!previewImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewImage(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewImage]);

  function open(id: string) {
    const target = conversations.find((c) => c.id === id);
    setActiveId(id);
    setThreadMessages([]);
    setPartnerLastReadAt(target?.partnerLastReadAt ?? null);
    setPendingAttachment(null);
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    router.push(`/messages/${id}`);
    startTransition(() => {
      markConversationRead(id).catch(() => {});
    });
  }

  /** One-click conversation with platform support. */
  function messageAdmin() {
    startTransition(async () => {
      const result = await startConversationWithAdmin();
      if (!result.ok) toast({ title: result.error, variant: "error" });
      else router.push(`/messages/${result.conversationId}`);
    });
  }

  /** Admin inbox: start a conversation with a teacher directly. */
  function messageTeacher(teacherId: string) {
    startTransition(async () => {
      const result = await startConversation(teacherId);
      if (!result.ok) toast({ title: result.error, variant: "error" });
      else router.push(`/messages/${result.conversationId}`);
    });
  }

  function sendText() {
    const content = draft.trim();
    if (!content || !activeId) return;
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    // Optimistic render: the message appears instantly; the SSE echo
    // replaces the temporary row with the confirmed one. The clientId makes
    // the send idempotent server-side (retries never duplicate).
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const clientId = crypto.randomUUID();
    setThreadMessages((prev) => [
      ...prev,
      {
        id: tempId,
        senderId: currentUserId,
        content,
        type: "TEXT",
        attachmentUrl: null,
        createdAt: new Date().toISOString(),
      },
    ]);
    startTransition(async () => {
      const result = await sendMessage(activeId, { content, clientId });
      if (!result.ok) {
        setThreadMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast({ title: result.error ?? "Message not sent.", variant: "error" });
      }
    });
  }

  async function sendAttachment() {
    if (!pendingAttachment || !activeId) return;
    const attachment = pendingAttachment;
    setPendingAttachment(null);
    // Optimistic: the photo appears in the thread instantly (local blob
    // preview) while the upload runs — the SSE echo replaces it with the
    // confirmed message, same as text.
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setThreadMessages((prev) => [
      ...prev,
      {
        id: tempId,
        senderId: currentUserId,
        content: "📷 Image",
        type: "IMAGE",
        attachmentUrl: attachment.url,
        createdAt: new Date().toISOString(),
      },
    ]);
    setAttachmentUploading(true);
    try {
      const upload = await uploadChatImage(attachment.file);
      if (!upload.ok) {
        setThreadMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast({ title: upload.error, variant: "error" });
        return;
      }
      const sent = await sendMessage(activeId, {
        content: "📷 Image",
        attachmentUrl: upload.path,
        messageType: "IMAGE",
      });
      if (!sent.ok) {
        setThreadMessages((prev) => prev.filter((m) => m.id !== tempId));
        toast({ title: sent.error ?? "Message not sent.", variant: "error" });
      } else {
        URL.revokeObjectURL(attachment.url);
      }
    } finally {
      setAttachmentUploading(false);
    }
  }

  function send() {
    if (pendingAttachment) {
      sendText();
      void sendAttachment();
    } else {
      sendText();
    }
  }

  function onTyping() {
    if (!activeId) return;
    // Throttle typing events to once per 1.5s.
    if (typingThrottleRef.current) return;
    typingThrottleRef.current = setTimeout(() => {
      typingThrottleRef.current = null;
    }, 1500);
    sendTyping(activeId).catch(() => {});
  }

  function resizeTextarea() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  const filtered = conversations.filter((c) =>
    c.otherName.toLowerCase().includes(filter.toLowerCase()),
  );

  const typingUserId = [...typingUsers.entries()].find(([, cid]) => cid === activeId)?.[0];
  const isOtherTyping = Boolean(typingUserId && typingUserId !== currentUserId);
  const active = conversations.find((c) => c.id === activeId);
  const threadName = active?.otherName || initialThread.otherName;
  const threadAvatar = active?.otherAvatarUrl ?? initialThread.otherAvatarUrl;
  const threadRole = active?.otherRole || initialThread.otherRole;

  return (
    <>
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

        {directory && (
          <div className="border-b border-line p-3">
            {directory.adminId ? (
              <button
                type="button"
                onClick={messageAdmin}
                className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-line bg-brand-soft/30 px-3 py-2.5 text-[12px] font-bold text-brand-fg transition-colors hover:border-brand hover:bg-brand-soft/50"
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Message admin / support
              </button>
            ) : directory.teachers.length > 0 ? (
              <div>
                <p className="mb-1.5 px-1 text-[10px] font-extrabold uppercase tracking-wide text-faint-fg">
                  Message a teacher
                </p>
                <ul className="max-h-44 space-y-0.5 overflow-y-auto no-scrollbar">
                  {directory.teachers.map((teacher) => (
                    <li key={teacher.id}>
                      <button
                        type="button"
                        onClick={() => messageTeacher(teacher.id)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-card-2"
                      >
                        <Avatar name={teacher.name} src={teacher.avatarUrl} size="xs" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12px] font-bold text-foreground">
                            {teacher.name}
                          </span>
                          {teacher.headline && (
                            <span className="block truncate text-[10px] text-faint-fg">
                              {teacher.headline}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        {adminOversight.length > 0 && (
          <div className="border-b border-line p-3">
            <p className="mb-1.5 px-1 text-[10px] font-extrabold uppercase tracking-wide text-faint-fg">
              All conversations (oversight)
            </p>
            <ul className="max-h-44 space-y-0.5 overflow-y-auto no-scrollbar">
              {adminOversight.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => open(c.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-card-2",
                      activeId === c.id && "bg-brand-soft/50",
                    )}
                  >
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-muted-fg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-bold text-accent">
                        👩‍🏫 {c.teacherName}
                      </span>
                      <span className="block truncate text-[11px] font-bold text-brand-fg">
                        🎓 {c.studentName}
                      </span>
                      <span className="block truncate text-[10px] text-faint-fg">
                        {timeAgo(c.lastAt)} · {c.lastContent}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6">
              <EmptyState
                compact
                icon={<MessageSquare />}
                title="No conversations"
                description={
                  directory?.adminId
                    ? "Message admin to reach support — or start from a teacher's profile."
                    : "Message a teacher from the list above."
                }
              />
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-6 text-center text-[12px] text-faint-fg">No conversations match your search</p>
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
                          <div className="flex min-w-0 items-center gap-1.5">
                            <p className="truncate text-[13px] font-bold text-foreground">{c.otherName}</p>
                            {c.otherRole && (
                              <Badge variant="outline" size="sm">{roleLabel(c.otherRole)}</Badge>
                            )}
                          </div>
                          <span className="shrink-0 text-[10px] text-faint-fg">{timeAgo(c.lastAt)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("truncate text-[12px]", c.unread > 0 ? "font-bold text-foreground" : "text-faint-fg")}>
                            {c.lastFromMe && "You: "}
                            {c.lastContent}
                          </p>
                          {c.unread > 0 && (
                            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-extrabold text-white">
                              {c.unread > 99 ? "99+" : c.unread}
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
              <Avatar
                name={threadName}
                src={threadAvatar}
                size="sm"
                status={otherUserId && onlineUsers.has(otherUserId) ? "online" : undefined}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-bold text-foreground">{threadName}</p>
                  {threadRole && <Badge variant="outline" size="sm">{roleLabel(threadRole)}</Badge>}
                </div>
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
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-5">
              {threadMessages.length === 0 && (
                <p className="pt-10 text-center text-[12px] text-faint-fg">
                  No messages yet — say hello and start the conversation.
                </p>
              )}
              {threadMessages.map((m, i) => {
                const own = m.senderId === currentUserId;
                const prev = threadMessages[i - 1];
                const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
                const firstOfGroup =
                  newDay || !prev || prev.senderId !== m.senderId;
                const seen =
                  own &&
                  Boolean(partnerLastReadAt && new Date(partnerLastReadAt) >= new Date(m.createdAt));
                return (
                  <div key={m.id}>
                    {newDay && (
                      <div className="my-4 flex items-center gap-3">
                        <span className="h-px flex-1 bg-line" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-faint-fg">
                          {dayLabel(m.createdAt)}
                        </span>
                        <span className="h-px flex-1 bg-line" />
                      </div>
                    )}
                    <div className={cn("flex gap-2.5", own ? "flex-row-reverse" : "", firstOfGroup && !newDay ? "mt-2.5" : "mt-0.5")}>
                      <div className={cn("w-8 shrink-0", own && "hidden")}>
                        {!own && firstOfGroup ? (
                          /* Oversight threads: each sender keeps their own
                             profile photo (teacher/student logos differ). */
                          <Avatar
                            name={initialThread.senderNames?.[m.senderId] ?? threadName}
                            src={initialThread.senderAvatars?.[m.senderId] || threadAvatar}
                            size="sm"
                          />
                        ) : null}
                      </div>
                      <div className={cn("max-w-[75%] min-w-0", own && "text-right")}>
                        {/* Admin oversight: label every message with its sender. */}
                        {initialThread.senderNames && (
                          <p
                            className={cn(
                              "mb-0.5 text-[10px] font-bold",
                              initialThread.senderRoles?.[m.senderId] === "TEACHER"
                                ? "text-accent"
                                : "text-brand-fg",
                            )}
                          >
                            {initialThread.senderNames[m.senderId] ?? "Unknown"}
                            {" · "}
                            {roleLabel(initialThread.senderRoles?.[m.senderId] ?? "")}
                          </p>
                        )}
                        <div
                          className={cn(
                            "inline-block rounded-2xl px-4 py-2.5 text-left text-[13px] leading-relaxed",
                            own
                              ? cn("bg-brand text-white", firstOfGroup && "rounded-br-md")
                              : cn("bg-card-2 text-foreground", firstOfGroup && "rounded-bl-md"),
                          )}
                        >
                          {m.type === "IMAGE" && attachmentSrc(m.attachmentUrl) ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  src: attachmentSrc(m.attachmentUrl)!,
                                  alt: `Image from ${own ? "you" : threadName}`,
                                })
                              }
                              className="block"
                              aria-label="Open image preview"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={attachmentSrc(m.attachmentUrl)!}
                                alt="Attachment"
                                className="max-h-56 rounded-xl transition-transform hover:scale-[1.02]"
                              />
                            </button>
                          ) : (
                            m.content
                          )}
                        </div>
                        <p className={cn("mt-1 text-[10px]", seen ? "font-bold text-success" : "text-faint-fg")}>
                          {formatTime(m.createdAt)}
                          {seen && " · Seen"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Composer (hidden for read-only admin oversight threads) */}
            {readOnly ? (
              <div className="border-t border-line px-5 py-3">
                <p className="flex items-center gap-2 text-[12px] font-semibold text-faint-fg">
                  <ShieldCheck className="h-3.5 w-3.5" /> Read-only — you are viewing this
                  conversation as an admin.
                </p>
              </div>
            ) : (
            <div className="border-t border-line p-4">
              {isOtherTyping && (
                <p className="mb-1.5 text-[11px] font-bold text-brand-fg">{threadName} is typing…</p>
              )}
              {pendingAttachment && (
                <div className="mb-2 flex items-center gap-2">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pendingAttachment.url} alt="Attachment preview" className="h-14 w-14 rounded-lg object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(pendingAttachment.url);
                        setPendingAttachment(null);
                      }}
                      aria-label="Remove attachment"
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-[11px] text-faint-fg">Ready to send — press send or remove it.</p>
                </div>
              )}
              <div className="flex items-end gap-2">
                <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line text-faint-fg transition-colors hover:text-foreground">
                  {attachmentUploading ? <SpinnerDots /> : <ImagePlus className="h-4 w-4" />}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPendingAttachment({ file, url: URL.createObjectURL(file) });
                      }
                      e.target.value = "";
                    }}
                  />
                </label>
                <div className="min-w-0 flex-1">
                  <textarea
                    ref={textareaRef}
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value);
                      resizeTextarea();
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
                    rows={1}
                    maxLength={2000}
                    className="max-h-32 min-h-10 w-full resize-none overflow-y-auto rounded-xl border border-line bg-card px-3.5 py-2.5 text-[13px] placeholder:text-faint-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
                  />
                  {draft.length > 1500 && (
                    <p className="mt-0.5 text-right text-[10px] text-faint-fg">{draft.length}/2000</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={send}
                  disabled={(!draft.trim() && !pendingAttachment) || attachmentUploading}
                  aria-label="Send"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
            )}
          </>
        )}
      </section>
    </div>

      {/* Image preview lightbox — fixed-position so it can never be clipped
          by the overflow-hidden messaging layout (sender + receiver). */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={previewImage.alt}
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            aria-label="Close preview"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
          >
            <X className="h-5 w-5" />
          </button>
          <div
            className="max-h-[85vh] max-w-[92vw]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage.src}
              alt={previewImage.alt}
              className="max-h-[85vh] max-w-[92vw] rounded-xl object-contain shadow-lift"
            />
          </div>
        </div>
      )}
    </>
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
