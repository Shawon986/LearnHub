"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Hand,
  ListChecks,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import type { ClassroomPoll } from "@/lib/live/bus";
import {
  closePoll,
  createPoll,
  removeParticipant,
  setParticipantMuted,
} from "@/lib/actions/live";

type Panel = "chat" | "people" | "polls" | "none";

interface PollWithState extends ClassroomPoll {
  counts?: number[];
  totalVotes?: number;
  closed?: boolean;
}

export function Panels({
  panel,
  setPanel,
  messages,
  draft,
  setDraft,
  onSend,
  chatLocked,
  isHost,
  classId,
  people,
  hands,
  mutedUsers,
  polls,
  user,
  onVote,
}: {
  panel: Panel;
  setPanel: (p: Panel) => void;
  messages: { id: string; userId: string; userName: string; content: string; at: string; own: boolean }[];
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  chatLocked: boolean;
  isHost: boolean;
  classId: string;
  people: { id: string; name: string; avatarUrl: string | null; role: string }[];
  hands: Set<string>;
  mutedUsers: Set<string>;
  polls: Map<string, PollWithState>;
  user: { id: string };
  onVote: (classId: string, pollId: string, optionIndex: number) => Promise<{ ok: boolean; error?: string }>;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex shrink-0 border-b border-line">
        <TabButton active={panel === "chat"} onClick={() => setPanel("chat")} icon={<MessageSquare className="h-4 w-4" />} label="Chat" />
        <TabButton active={panel === "people"} onClick={() => setPanel("people")} icon={<Users className="h-4 w-4" />} label={`People (${people.length})`} />
        <TabButton active={panel === "polls"} onClick={() => setPanel("polls")} icon={<ListChecks className="h-4 w-4" />} label="Polls" />
      </div>

      {panel === "chat" && (
        <ChatPanel messages={messages} draft={draft} setDraft={setDraft} onSend={onSend} chatLocked={chatLocked} isHost={isHost} />
      )}
      {panel === "people" && (
        <PeoplePanel classId={classId} people={people} hands={hands} mutedUsers={mutedUsers} isHost={isHost} selfId={user.id} />
      )}
      {panel === "polls" && <PollsPanel classId={classId} polls={polls} isHost={isHost} onVote={onVote} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-3 text-[12px] font-bold transition-colors",
        active ? "border-brand text-brand-fg" : "border-transparent text-faint-fg hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/* ---------------- Chat ---------------- */

function ChatPanel({
  messages,
  draft,
  setDraft,
  onSend,
  chatLocked,
  isHost,
}: {
  messages: { id: string; userId: string; userName: string; content: string; at: string; own: boolean }[];
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  chatLocked: boolean;
  isHost: boolean;
}) {
  return (
    <>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="pt-8 text-center text-[12px] text-faint-fg">
            Say hello! Messages appear here in real time.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex gap-2.5", m.own && "flex-row-reverse")}>
            <div className="min-w-0 max-w-[80%]">
              {!m.own && <p className="text-[11px] font-bold text-faint-fg">{m.userName}</p>}
              <p
                className={cn(
                  "mt-0.5 rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed",
                  m.own ? "bg-brand text-white" : "bg-card-2 text-foreground",
                )}
              >
                {m.content}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-line p-3">
        {chatLocked && !isHost ? (
          <p className="flex items-center justify-center gap-1.5 py-2 text-center text-[12px] font-bold text-faint-fg">
            <Lock className="h-3.5 w-3.5" /> Chat is locked by the host
          </p>
        ) : (
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSend();
              }}
              placeholder="Type a message…"
              aria-label="Chat message"
              className="h-10 flex-1"
            />
            <Button size="icon" onClick={onSend} aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- People ---------------- */

function PeoplePanel({
  classId,
  people,
  hands,
  mutedUsers,
  isHost,
  selfId,
}: {
  classId: string;
  people: { id: string; name: string; avatarUrl: string | null; role: string }[];
  hands: Set<string>;
  mutedUsers: Set<string>;
  isHost: boolean;
  selfId: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  function act(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const r = await action();
      if (!r.ok) toast({ title: r.error ?? "Action failed.", variant: "error" });
      else router.refresh();
    });
  }

  return (
    <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
      {people.map((p) => {
        const hand = hands.has(p.id);
        const muted = mutedUsers.has(p.id);
        const self = p.id === selfId;
        return (
          <li key={p.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={p.name} src={p.avatarUrl} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-[13px] font-bold text-foreground">
                {p.name.split(" ")[0]}
                {self && <span className="text-[10px] font-bold text-faint-fg">(you)</span>}
                {p.role === "HOST" && <Badge variant="brand" size="sm">Host</Badge>}
              </p>
              <p className="flex items-center gap-1 text-[11px] text-faint-fg">
                {muted ? <MicOff className="h-3 w-3 text-danger" /> : <Mic className="h-3 w-3 text-success" />}
                {hand && (
                  <span className="inline-flex items-center gap-0.5 text-gold">
                    <Hand className="h-3 w-3 fill-current" /> Hand raised
                  </span>
                )}
              </p>
            </div>
            {isHost && p.role !== "HOST" && (
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label={muted ? `Unmute ${p.name}` : `Mute ${p.name}`}
                  onClick={() => act(() => setParticipantMuted(classId, p.id, !muted))}
                  className="rounded-lg p-1.5 text-faint-fg transition-colors hover:bg-card-2 hover:text-foreground"
                >
                  {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${p.name}`}
                  onClick={() => {
                    if (window.confirm(`Remove ${p.name} from this class?`)) {
                      act(() => removeParticipant(classId, p.id));
                    }
                  }}
                  className="rounded-lg p-1.5 text-faint-fg transition-colors hover:bg-danger-soft hover:text-danger"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- Polls ---------------- */

function PollsPanel({
  classId,
  polls,
  isHost,
  onVote,
}: {
  classId: string;
  polls: Map<string, PollWithState>;
  isHost: boolean;
  onVote: (classId: string, pollId: string, optionIndex: number) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState("");
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function submitCreate(e: FormEvent) {
    e.preventDefault();
    const optionList = options.split("\n").map((s) => s.trim()).filter(Boolean);
    if (optionList.length < 2) {
      toast({ title: "Add at least two options (one per line).", variant: "error" });
      return;
    }
    startTransition(async () => {
      const r = await createPoll(classId, { question, options: optionList });
      if (r.ok) {
        setCreating(false);
        setQuestion("");
        setOptions("");
      } else toast({ title: r.error ?? "Could not create poll.", variant: "error" });
    });
  }

  const pollList = [...polls.values()];

  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
      {isHost && !creating && (
        <Button size="sm" className="w-full" onClick={() => setCreating(true)}>
          + New poll
        </Button>
      )}
      {creating && (
        <form onSubmit={submitCreate} className="space-y-2 rounded-xl border border-line bg-card-2/50 p-3">
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Question" className="h-9" />
          <textarea
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            placeholder={"Options (one per line)\ne.g. Yes\nNo"}
            rows={3}
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-[13px] focus:border-brand focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={pending}>
              Start poll
            </Button>
          </div>
        </form>
      )}

      {pollList.length === 0 && !creating && (
        <p className="pt-6 text-center text-[12px] text-faint-fg">
          {isHost ? "Create a poll to ask the class anything." : "No polls yet — the host can create one."}
        </p>
      )}

      {pollList.map((poll) => {
        const total = poll.totalVotes ?? 0;
        return (
          <div key={poll.id} className="rounded-xl border border-line bg-card p-4">
            <p className="text-[13px] font-bold text-foreground">{poll.question}</p>
            <div className="mt-3 space-y-2">
              {poll.options.map((option, i) => {
                const count = poll.counts?.[i] ?? 0;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={i}>
                    <button
                      type="button"
                      disabled={poll.closed}
                      onClick={() =>
                        startTransition(async () => {
                          const r = await onVote(classId, poll.id, i);
                          if (!r.ok) toast({ title: r.error ?? "Could not vote.", variant: "error" });
                        })
                      }
                      className={cn(
                        "relative w-full overflow-hidden rounded-lg border border-line px-3 py-2 text-left text-[12px] font-semibold transition-colors",
                        !poll.closed && "hover:border-brand hover:bg-brand-soft/40",
                        poll.closed && "cursor-default",
                      )}
                    >
                      {poll.closed && (
                        <span
                          className="absolute inset-y-0 left-0 bg-brand-soft/70"
                          style={{ width: `${pct}%` }}
                          aria-hidden
                        />
                      )}
                      <span className="relative flex justify-between">
                        <span>{option}</span>
                        {poll.closed && (
                          <span className="tabular-nums text-muted-fg">
                            {count} · {pct}%
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-faint-fg">
              {poll.closed ? `Closed · ${total} vote${total === 1 ? "" : "s"}` : `${total} vote${total === 1 ? "" : "s"} so far`}
            </p>
            {isHost && !poll.closed && (
              <Button
                size="sm"
                variant="secondary"
                className="mt-2 w-full"
                onClick={() =>
                  startTransition(async () => {
                    const r = await closePoll(classId, poll.id);
                    if (!r.ok) toast({ title: r.error ?? "Could not close poll.", variant: "error" });
                  })
                }
              >
                Close poll
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
