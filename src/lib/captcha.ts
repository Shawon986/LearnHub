// Lightweight built-in human check — server-generated arithmetic challenge.
// FREE and dependency-free: works out of the box with zero configuration.
//
// Multi-instance note: the challenge store is in-memory, so it is only
// authoritative on a single instance. For a horizontally scaled production
// deployment, swap this module for Cloudflare Turnstile (env:
// TURNSTILE_SECRET_KEY / NEXT_PUBLIC_TURNSTILE_SITE_KEY) or a Redis-backed
// challenge store — the API shape (GET /api/captcha → { id, a, b } +
// hidden captchaId/captchaAnswer form fields) is designed to survive that.

interface Challenge {
  answer: number;
  expires: number;
}

const store = new Map<string, Challenge>();
const TTL_MS = 5 * 60_000;

function sweep() {
  const now = Date.now();
  for (const [id, ch] of store) {
    if (ch.expires < now) store.delete(id);
  }
}

export interface CaptchaChallenge {
  id: string;
  a: number;
  b: number;
}

/** Create a fresh arithmetic challenge (id + operands). */
export function createCaptchaChallenge(): CaptchaChallenge {
  sweep();
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  const id = crypto.randomUUID();
  store.set(id, { answer: a + b, expires: Date.now() + TTL_MS });
  return { id, a, b };
}

/** Validate a one-time answer. Consumes the challenge on any attempt. */
export function verifyCaptcha(id: string | null | undefined, answer: string | null | undefined): boolean {
  if (!id || answer == null || answer.trim() === "") return false;
  const ch = store.get(id);
  if (!ch) return false;
  store.delete(id);
  if (ch.expires < Date.now()) return false;
  return Number(answer.trim()) === ch.answer;
}
