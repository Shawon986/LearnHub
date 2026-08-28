// In-memory classroom event bus.
//
// Single-process realtime: SSE streams + event fan-out. For multi-instance
// production, swap this store for Redis pub/sub — the exported API
// (subscribe/publish/pollStore) stays identical. See docs/live-classes.md.

export type ClassroomEvent =
  | { type: "chat"; id: string; userId: string; userName: string; content: string; at: string }
  | { type: "presence"; userId: string; userName: string; role: string; status: "joined" | "left"; at: string }
  | { type: "hand"; userId: string; userName: string; raised: boolean }
  | { type: "reaction"; userId: string; userName: string; emoji: string; at: string }
  | { type: "poll.created"; poll: ClassroomPoll }
  | { type: "poll.vote"; pollId: string; counts: number[]; totalVotes: number }
  | { type: "poll.closed"; pollId: string; counts: number[]; totalVotes: number }
  | { type: "chat.lock"; locked: boolean }
  | { type: "participant.muted"; userId: string; muted: boolean }
  | { type: "participant.removed"; userId: string }
  | { type: "class.started"; at: string }
  | { type: "class.ended"; at: string }
  | { type: "recording"; status: string }
  | { type: "whiteboard.stroke"; stroke: StrokeData }
  | { type: "whiteboard.clear" }
  | {
      type: "signal";
      from: string;
      fromName: string;
      to: string;
      payload: WebRtcSignal;
    };

export interface StrokeData {
  id: string;
  userId: string;
  userName: string;
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

export interface ClassroomPoll {
  id: string;
  question: string;
  options: string[];
  createdBy: string;
  createdAt: string;
  open: boolean;
}

/** WebRTC mesh signaling payload (relayed over the classroom bus). */
export type WebRtcSignal =
  | { kind: "offer"; sdp: string }
  | { kind: "answer"; sdp: string }
  | { kind: "ice"; candidate: unknown }
  | { kind: "hangup" };

interface PollState extends ClassroomPoll {
  votes: Map<string, number>;
}

type Listener = (event: ClassroomEvent) => void;

class ClassroomBus {
  private listeners = new Map<string, Set<Listener>>();
  private polls = new Map<string, Map<string, PollState>>();
  private strokes = new Map<string, StrokeData[]>();

  subscribe(classId: string, listener: Listener): () => void {
    let set = this.listeners.get(classId);
    if (!set) {
      set = new Set();
      this.listeners.set(classId, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
      if (set && set.size === 0) this.listeners.delete(classId);
    };
  }

  publish(classId: string, event: ClassroomEvent): void {
    const set = this.listeners.get(classId);
    if (set) {
      for (const listener of [...set]) {
        try {
          listener(event);
        } catch (e) {
          console.error("[classroom-bus] listener error:", e);
        }
      }
    }
  }

  /* ---- Polls (session-scoped, ephemeral like Zoom polls) ---- */

  getPolls(classId: string): ClassroomPoll[] {
    const map = this.polls.get(classId);
    if (!map) return [];
    return [...map.values()].map((poll) => ({
      id: poll.id,
      question: poll.question,
      options: poll.options,
      createdBy: poll.createdBy,
      createdAt: poll.createdAt,
      open: poll.open,
    }));
  }

  createPoll(classId: string, poll: ClassroomPoll): void {
    let map = this.polls.get(classId);
    if (!map) {
      map = new Map();
      this.polls.set(classId, map);
    }
    map.set(poll.id, { ...poll, votes: new Map() });
    this.publish(classId, { type: "poll.created", poll });
  }

  votePoll(classId: string, pollId: string, userId: string, optionIndex: number): { counts: number[]; totalVotes: number } | null {
    const poll = this.polls.get(classId)?.get(pollId);
    if (!poll || !poll.open) return null;
    poll.votes.set(userId, optionIndex);
    const counts = poll.options.map((_, i) => [...poll.votes.values()].filter((v) => v === i).length);
    const snapshot = { counts, totalVotes: poll.votes.size };
    this.publish(classId, { type: "poll.vote", pollId, ...snapshot });
    return snapshot;
  }

  closePoll(classId: string, pollId: string): { counts: number[]; totalVotes: number } | null {
    const poll = this.polls.get(classId)?.get(pollId);
    if (!poll) return null;
    poll.open = false;
    const counts = poll.options.map((_, i) => [...poll.votes.values()].filter((v) => v === i).length);
    const snapshot = { counts, totalVotes: poll.votes.size };
    this.publish(classId, { type: "poll.closed", pollId, ...snapshot });
    return snapshot;
  }

  clearClassroom(classId: string): void {
    this.polls.delete(classId);
    this.strokes.delete(classId);
  }

  /* ---- Whiteboard strokes (session-scoped replay buffer) ---- */

  addStroke(classId: string, stroke: StrokeData): void {
    const list = this.strokes.get(classId) ?? [];
    list.push(stroke);
    this.strokes.set(classId, list);
    this.publish(classId, { type: "whiteboard.stroke", stroke });
  }

  getStrokes(classId: string): StrokeData[] {
    return this.strokes.get(classId) ?? [];
  }

  clearStrokes(classId: string): void {
    this.strokes.set(classId, []);
    this.publish(classId, { type: "whiteboard.clear" });
  }
}

export const classroomBus = new ClassroomBus();
