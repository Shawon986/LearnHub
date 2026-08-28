// Personal-channel messaging bus (same in-process SSE pattern as
// classrooms). Each user has a channel; events fan out to participants.
// Swap for Redis pub/sub in multi-instance production.

export type MessageEvent =
  | {
      type: "message";
      id: string;
      conversationId: string;
      senderId: string;
      senderName: string;
      senderAvatarUrl: string | null;
      content: string;
      attachmentUrl: string | null;
      messageType: string;
      createdAt: string;
    }
  | { type: "typing"; conversationId: string; userId: string; userName: string }
  | { type: "presence"; userId: string; online: boolean }
  | { type: "conversation.new"; conversationId: string }
  | {
      type: "notification";
      id: string;
      title: string;
      body: string | null;
      data: Record<string, unknown>;
      createdAt: string;
    };

type Listener = (event: MessageEvent) => void;

class MessagingBus {
  private listeners = new Map<string, Set<Listener>>();
  /** user → number of open streams (for online/offline detection). */
  private connections = new Map<string, number>();
  private online = new Set<string>();

  subscribe(userId: string, listener: Listener): () => void {
    const key = `user:${userId}`;
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
      if (set && set.size === 0) this.listeners.delete(key);
    };
  }

  publishTo(userId: string, event: MessageEvent): void {
    const set = this.listeners.get(`user:${userId}`);
    if (!set) return;
    for (const listener of [...set]) {
      try {
        listener(event);
      } catch (e) {
        console.error("[messaging-bus] listener error:", e);
      }
    }
  }

  /** Mark a user online and broadcast presence to their conversation partners. */
  markOnline(userId: string, partners: string[]): void {
    const wasOnline = this.online.has(userId);
    this.connections.set(userId, (this.connections.get(userId) ?? 0) + 1);
    this.online.add(userId);
    if (!wasOnline) {
      for (const partner of partners) {
        this.publishTo(partner, { type: "presence", userId, online: true });
      }
    }
  }

  /** One stream closed; broadcast offline when the last one goes away. */
  markOffline(userId: string, partners: string[]): void {
    const remaining = Math.max(0, (this.connections.get(userId) ?? 1) - 1);
    if (remaining === 0) {
      this.connections.delete(userId);
      if (this.online.delete(userId)) {
        for (const partner of partners) {
          this.publishTo(partner, { type: "presence", userId, online: false });
        }
      }
    } else {
      this.connections.set(userId, remaining);
    }
  }

  isOnline(userId: string): boolean {
    return this.online.has(userId);
  }
}

export const messagingBus = new MessagingBus();
