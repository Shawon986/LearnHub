import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomBytes, randomInt } from "crypto";

/** Merge Tailwind classes with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** URL-safe slug from arbitrary text. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "Shawon" → "LEARN-SHAWON-482" */
export function generateReferralCode(name: string): string {
  const base = slugify(name).replace(/-/g, "").slice(0, 12).toUpperCase() || "STUDENT";
  const suffix = randomInt(100, 999);
  return `LEARN-${base}-${suffix}`;
}

/** Cryptographically random hex token (verification, password reset…). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/** Short random id for certificate numbers etc. */
export function generateShortCode(length = 10): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  const buf = randomBytes(length);
  for (let i = 0; i < length; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Prisma Json columns come back as unknown — decode defensively. */
export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  try {
    if (typeof value === "string") return JSON.parse(value) as T;
    return value as T;
  } catch {
    return fallback;
  }
}

/** Deterministic gradient key for placeholder thumbnails/avatars. */
export function gradientFor(seed: string): string {
  const gradients = [
    "from-blue-500 via-sky-500 to-teal-500",
    "from-teal-500 via-emerald-500 to-cyan-500",
    "from-amber-500 via-orange-500 to-rose-500",
    "from-sky-500 via-blue-500 to-indigo-500",
    "from-rose-500 via-pink-500 to-fuchsia-500",
    "from-emerald-500 via-teal-500 to-sky-500",
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return gradients[hash % gradients.length];
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
