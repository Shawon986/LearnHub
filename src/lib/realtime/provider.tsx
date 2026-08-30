"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Single shared SSE connection for the whole app.
 * The messaging inbox, the notification bell and the dashboard shells all
 * subscribe to the SAME EventSource — no duplicate streams, one connection
 * state, one reconnect path. Consumers react to the `reconnecting → live`
 * transition by refetching canonical server state, so events missed while
 * offline are recovered (reconciliation, not polling).
 */

interface RealtimeContextValue {
  subscribe: (listener: (raw: string) => void) => () => void;
  connection: "connecting" | "live" | "reconnecting";
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<"connecting" | "live" | "reconnecting">("connecting");
  const listeners = useRef(new Set<(raw: string) => void>());
  const reconnects = useRef(0);

  useEffect(() => {
    const es = new EventSource("/api/messages/stream");
    es.onmessage = (m) => {
      if (m.data.startsWith(":")) return;
      for (const l of [...listeners.current]) {
        try {
          l(m.data);
        } catch {
          /* listener errors are non-fatal */
        }
      }
    };
    es.onopen = () => {
      setConnection("live");
      reconnects.current += 1;
    };
    es.onerror = () => setConnection("reconnecting");
    return () => es.close();
  }, []);

  return (
    <RealtimeContext.Provider value={{ subscribe: (l) => {
      listeners.current.add(l);
      return () => listeners.current.delete(l);
    }, connection }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeStream(onEvent?: (raw: string) => void) {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtimeStream must be used inside <RealtimeProvider>");
  const { subscribe, connection } = ctx;
  const callback = useRef(onEvent);
  // Keep the latest callback in a ref (assigned in an effect, never render).
  useEffect(() => {
    callback.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    return subscribe((raw) => callback.current?.(raw));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { connection };
}
