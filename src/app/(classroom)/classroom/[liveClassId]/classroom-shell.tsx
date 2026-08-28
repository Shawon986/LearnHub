"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Hand,
  LogOut,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PenTool,
  Video,
  VideoOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import {
  joinClassroom,
  leaveClassroom,
  raiseHand,
  sendChatMessage,
  sendReaction,
  toggleChatLock,
  toggleRecording,
  votePoll,
} from "@/lib/actions/live";
import type { ClassroomEvent, ClassroomPoll, StrokeData } from "@/lib/live/bus";
import { Whiteboard } from "./whiteboard";
import { Panels } from "./panels";
import { useWebrtc, type SignalEvent } from "./use-webrtc";

export interface ClassroomProps {
  classId: string;
  classTitle: string;
  status: string;
  isHost: boolean;
  chatLocked: boolean;
  user: { id: string; name: string; avatarUrl: string | null };
  host: { id: string; name: string; avatarUrl: string | null };
  participants: {
    id: string;
    name: string;
    avatarUrl: string | null;
    muted: boolean;
    handRaised: boolean;
    joined: boolean;
  }[];
  room: { roomName: string; token: string; url: string };
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  at: string;
  own: boolean;
}

interface PresenceEntry {
  name: string;
  role: string;
  joined: boolean;
}

export function ClassroomShell(props: ClassroomProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Realtime state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [presence, setPresence] = useState<Map<string, PresenceEntry>>(
    () =>
      new Map(
        props.participants.map((p) => [
          p.id,
          { name: p.name, role: "STUDENT", joined: p.joined },
        ]),
      ),
  );
  const [hands, setHands] = useState<Set<string>>(new Set());
  const [reactions, setReactions] = useState<{ id: string; userName: string; emoji: string }[]>([]);
  const [polls, setPolls] = useState<Map<string, ClassroomPoll & { counts?: number[]; totalVotes?: number; closed?: boolean }>>(new Map());
  const [strokes, setStrokes] = useState<StrokeData[]>([]);
  const [chatLocked, setChatLocked] = useState(props.chatLocked);
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(
    () => new Set(props.participants.filter((p) => p.muted).map((p) => p.id)),
  );
  const [recording, setRecording] = useState(false);
  const [classEnded, setClassEnded] = useState(false);
  const [signals, setSignals] = useState<SignalEvent[]>([]);

  // Local UI state — camera/mic start ON so media actually opens.
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [panel, setPanel] = useState<"chat" | "people" | "polls" | "none">("chat");
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [handRaised, setHandRaised] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const reactionTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const pushReaction = useCallback((userName: string, emoji: string) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    setReactions((prev) => [...prev.slice(-9), { id, userName, emoji }]);
    const timer = setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id));
      reactionTimers.current.delete(id);
    }, 3500);
    reactionTimers.current.set(id, timer);
  }, []);

  // Subscribe to the classroom stream.
  useEffect(() => {
    const es = new EventSource(`/api/classrooms/${props.classId}/stream`);

    const handle = (raw: string) => {
      let event: ClassroomEvent;
      try {
        event = JSON.parse(raw) as ClassroomEvent;
      } catch {
        return;
      }
      switch (event.type) {
        case "chat":
          setMessages((prev) =>
            [...prev.slice(-99), { ...event, own: event.userId === props.user.id }],
          );
          break;
        case "presence":
          setPresence((prev) => {
            const next = new Map(prev);
            if (event.status === "left") next.delete(event.userId);
            else next.set(event.userId, { name: event.userName, role: event.role, joined: true });
            return next;
          });
          break;
        case "hand":
          setHands((prev) => {
            const next = new Set(prev);
            if (event.raised) next.add(event.userId);
            else next.delete(event.userId);
            return next;
          });
          break;
        case "reaction":
          pushReaction(event.userName, event.emoji);
          break;
        case "poll.created":
          setPolls((prev) => new Map(prev).set(event.poll.id, { ...event.poll }));
          break;
        case "poll.vote":
          setPolls((prev) => {
            const next = new Map(prev);
            const poll = next.get(event.pollId);
            if (poll) next.set(event.pollId, { ...poll, counts: event.counts, totalVotes: event.totalVotes });
            return next;
          });
          break;
        case "poll.closed":
          setPolls((prev) => {
            const next = new Map(prev);
            const poll = next.get(event.pollId);
            if (poll) next.set(event.pollId, { ...poll, counts: event.counts, totalVotes: event.totalVotes, closed: true });
            return next;
          });
          break;
        case "chat.lock":
          setChatLocked(event.locked);
          break;
        case "participant.muted":
          setMutedUsers((prev) => {
            const next = new Set(prev);
            if (event.muted) next.add(event.userId);
            else next.delete(event.userId);
            return next;
          });
          break;
        case "participant.removed":
          if (event.userId === props.user.id) {
            toast({ title: "You were removed from this class by the host.", variant: "error" });
            router.push("/dashboard/live");
          }
          setPresence((prev) => {
            const next = new Map(prev);
            next.delete(event.userId);
            return next;
          });
          break;
        case "class.ended":
          setClassEnded(true);
          toast({ title: "The host ended the class", variant: "info" });
          break;
        case "recording":
          setRecording(event.status === "recording");
          break;
        case "whiteboard.stroke":
          setStrokes((prev) => [...prev.slice(-499), event.stroke]);
          break;
        case "whiteboard.clear":
          setStrokes([]);
          break;
        case "class.started":
          break;
        case "signal":
          setSignals((prev) => [
            ...prev.slice(-30),
            { from: event.from, fromName: event.fromName, to: event.to, payload: event.payload },
          ]);
          break;
      }
    };

    es.onmessage = (m) => {
      if (m.data.startsWith(":")) return; // heartbeat
      handle(m.data);
    };
    es.onerror = () => {
      // EventSource auto-reconnects.
    };

    return () => es.close();
  }, [props.classId, props.user.id, pushReaction, router, toast]);

  // Join on mount.
  useEffect(() => {
    if (props.status === "LIVE") {
      joinClassroom(props.classId).catch(() => {});
    }
  }, [props.classId, props.status]);

  const isLive = props.status === "LIVE" && !classEnded;

  function sendMessage() {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    sendChatMessage(props.classId, content).then((r) => {
      if (!r.ok) toast({ title: r.error ?? "Message not sent.", variant: "error" });
    });
  }

  function toggleHand() {
    const next = !handRaised;
    setHandRaised(next);
    raiseHand(props.classId, next);
  }

  async function leave() {
    setIsLeaving(true);
    await leaveClassroom(props.classId).catch(() => {});
    router.push(props.isHost ? "/teacher/live-classes" : "/dashboard/live");
  }

  const people = props.isHost
    ? [
        { id: props.host.id, name: props.host.name, avatarUrl: props.host.avatarUrl, role: "HOST" },
        ...[...presence.entries()]
          .filter(([id]) => id !== props.host.id)
          .map(([id, p]) => ({ id, name: p.name, avatarUrl: null, role: p.role })),
      ]
    : [
        { id: props.host.id, name: props.host.name, avatarUrl: props.host.avatarUrl, role: "HOST" },
        ...props.participants
          .filter((p) => p.id !== props.user.id)
          .map((p) => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl, role: "STUDENT" })),
      ];

  // Dev WebRTC mesh: real camera/audio/screen-share between participants.
  const webrtc = useWebrtc({
    classId: props.classId,
    myId: props.user.id,
    active: isLive,
    camOn,
    micOn,
    signals,
  });

  function streamFor(userId: string): MediaStream | null {
    if (userId === props.user.id) return webrtc.localStream;
    return webrtc.remoteStreams.get(userId) ?? null;
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="glass flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Badge variant={isLive ? "success" : "neutral"}>
            {isLive ? "● Live" : props.status}
          </Badge>
          <h1 className="truncate text-[14px] font-bold text-foreground">{props.classTitle}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {props.isHost && isLive && (
            <button
              type="button"
              onClick={() => toggleRecording(props.classId)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors",
                recording ? "bg-danger text-white" : "bg-card-2 text-muted-fg hover:text-foreground",
              )}
            >
              {recording ? "● Recording" : "Record"}
            </button>
          )}
          {props.isHost && isLive && (
            <button
              type="button"
              onClick={() => {
                const next = !chatLocked;
                toggleChatLock(props.classId, next);
              }}
              className="rounded-full bg-card-2 px-3 py-1.5 text-[12px] font-bold text-muted-fg transition-colors hover:text-foreground"
            >
              {chatLocked ? "Unlock chat" : "Lock chat"}
            </button>
          )}
        </div>
      </header>

      {/* Reactions overlay */}
      {reactions.length > 0 && (
        <div className="pointer-events-none absolute bottom-24 right-6 z-20 flex flex-col gap-2">
          {reactions.map((r) => (
            <div
              key={r.id}
              className="glass animate-float rounded-full px-3 py-1.5 text-[13px] font-bold text-foreground"
            >
              {r.emoji} {r.userName.split(" ")[0]}
            </div>
          ))}
        </div>
      )}

      {/* Main area */}
      <div className="flex min-h-0 flex-1">
        {/* Video / whiteboard area */}
        <main className="relative min-w-0 flex-1 p-3">
          {whiteboardOpen && isLive ? (
            <Whiteboard classId={props.classId} strokes={strokes} isHost={props.isHost} />
          ) : (
            <div className="grid h-full auto-rows-fr grid-cols-2 gap-3 lg:grid-cols-3">
              {people.map((p) => {
                const muted = mutedUsers.has(p.id);
                const hand = hands.has(p.id);
                const stream = streamFor(p.id);
                const own = p.id === props.user.id;
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "relative flex min-h-28 items-center justify-center overflow-hidden rounded-2xl border border-line bg-card-2",
                      p.role === "HOST" && "bg-gradient-to-br from-brand/25 to-accent/20",
                    )}
                  >
                    {stream && stream.getVideoTracks().length > 0 && (
                      <video
                        autoPlay
                        playsInline
                        muted={own}
                        className="absolute inset-0 h-full w-full object-cover"
                        ref={(el) => {
                          if (el && el.srcObject !== stream) el.srcObject = stream;
                        }}
                      />
                    )}
                    {!stream && (
                      <div className="flex flex-col items-center gap-2">
                        <Avatar name={p.name} src={p.avatarUrl} size="lg" />
                      </div>
                    )}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/50 px-2 py-1 text-[11px] font-bold text-white">
                      {p.name.split(" ")[0]}
                      {own && " (you)"}
                      {muted ? <MicOff className="h-3 w-3 text-danger" /> : <Mic className="h-3 w-3 text-success" />}
                      {hand && <Hand className="h-3 w-3 fill-gold text-gold" />}
                    </div>
                    {p.role === "HOST" && (
                      <Badge variant="brand" size="sm" className="absolute left-2 top-2">
                        Host
                      </Badge>
                    )}
                  </div>
                );
              })}
              {webrtc.mediaError && (
                <p className="col-span-full self-end pb-2 text-center text-[11px] text-gold">{webrtc.mediaError}</p>
              )}
              {!webrtc.mediaError && !props.room.url && (
                <p className="col-span-full self-end pb-2 text-center text-[11px] text-faint-fg">
                  Camera & mic work peer-to-peer in this dev classroom. For large classes, configure
                  LIVEKIT (docs/live-classes.md).
                </p>
              )}
            </div>
          )}
        </main>

        {/* Side panel */}
        <aside className="hidden w-80 shrink-0 border-l border-line md:flex md:flex-col">
          <Panels
            panel={panel}
            setPanel={setPanel}
            messages={messages}
            draft={draft}
            setDraft={setDraft}
            onSend={sendMessage}
            chatLocked={chatLocked}
            isHost={props.isHost}
            classId={props.classId}
            people={people}
            hands={hands}
            mutedUsers={mutedUsers}
            polls={polls}
            user={props.user}
            onVote={votePoll}
          />
        </aside>
      </div>

      {/* Bottom control bar */}
      <footer className="glass flex h-16 shrink-0 items-center justify-center gap-2 border-t border-line px-4">
        <ControlButton label={micOn ? "Mute mic" : "Unmute mic"} active={micOn} onClick={() => setMicOn((v) => !v)}>
          {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </ControlButton>
        <ControlButton label={camOn ? "Turn off camera" : "Turn on camera"} active={camOn} onClick={() => setCamOn((v) => !v)}>
          {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </ControlButton>
        <ControlButton
          label={webrtc.screenSharing ? "Stop sharing screen" : "Share screen"}
          active={webrtc.screenSharing}
          onClick={() => void webrtc.toggleScreenShare()}
        >
          <MonitorUp className="h-5 w-5" />
        </ControlButton>
        <ControlButton label="Whiteboard" active={whiteboardOpen} onClick={() => setWhiteboardOpen((v) => !v)}>
          <PenTool className="h-5 w-5" />
        </ControlButton>
        <ControlButton label={handRaised ? "Lower hand" : "Raise hand"} active={handRaised} onClick={toggleHand}>
          <Hand className="h-5 w-5" />
        </ControlButton>
        {["👍", "❤️", "🎉", "👏", "😮", "😂"].map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`React ${emoji}`}
            onClick={() => sendReaction(props.classId, emoji)}
            className="rounded-full p-2 text-xl transition-transform hover:scale-125 active:scale-95"
          >
            {emoji}
          </button>
        ))}
        <div className="mx-2 h-6 w-px bg-line" aria-hidden />
        <button
          type="button"
          onClick={() => setMobilePanelOpen((v) => !v)}
          className="rounded-full p-2.5 text-muted-fg transition-colors hover:bg-card-2 md:hidden"
          aria-label="Toggle chat and participants"
        >
          <MessageSquare className="h-5 w-5" />
        </button>
        <button
          type="button"
          disabled={isLeaving}
          onClick={leave}
          className="flex items-center gap-1.5 rounded-full bg-danger px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-danger/90"
        >
          <LogOut className="h-4 w-4" /> Leave
        </button>
      </footer>

      {/* Mobile panel drawer (only when explicitly opened) */}
      {mobilePanelOpen && (
        <div className="fixed inset-x-0 bottom-16 top-14 z-30 md:hidden">
          <div className="glass flex h-full flex-col">
            <Panels
              panel={panel}
              setPanel={(p) => setPanel(p === panel ? "none" : p)}
              messages={messages}
              draft={draft}
              setDraft={setDraft}
              onSend={sendMessage}
              chatLocked={chatLocked}
              isHost={props.isHost}
              classId={props.classId}
              people={people}
              hands={hands}
              mutedUsers={mutedUsers}
              polls={polls}
              user={props.user}
              onVote={votePoll}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ControlButton({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "rounded-full p-2.5 transition-colors",
        active ? "bg-brand text-white" : "bg-card-2 text-muted-fg hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
