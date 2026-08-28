// In-memory sliding-window rate limiter.
//
// Good for a single Node process (dev, small deployments).
// For multi-instance production, swap the store for Redis —
// the exported API stays identical (docs/security.md).

type Window = { timestamps: number[] };

const store = new Map<string, Window>();

// Periodic cleanup so the map doesn't grow forever.
setInterval(
  () => {
    const now = Date.now();
    for (const [key, window] of store) {
      window.timestamps = window.timestamps.filter((t) => now - t < 15 * 60_000);
      if (window.timestamps.length === 0) store.delete(key);
    }
  },
  5 * 60_000,
).unref?.();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * @param key     unique scope (e.g. `login:${ip}`)
 * @param limit   max requests
 * @param windowMs window length
 */
export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
  entry.timestamps.push(now);

  const used = entry.timestamps.length;
  return {
    ok: used <= limit,
    remaining: Math.max(0, limit - used),
    retryAfterMs: entry.timestamps[0] ? windowMs - (now - entry.timestamps[0]) : 0,
  };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
