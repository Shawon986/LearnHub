// Formatting helpers — BDT currency, dates, durations, relative time.

const numberFmt = new Intl.NumberFormat("en-US");

/** 1500 → "৳1,500" */
export function formatBDT(amount: number): string {
  return `৳${numberFmt.format(Math.round(amount))}`;
}

/** 1500 → "BDT 1,500" for formal documents */
export function formatBDTLong(amount: number): string {
  return `BDT ${numberFmt.format(Math.round(amount))}`;
}

export function formatNumber(value: number): string {
  return numberFmt.format(value);
}

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const timeFmt = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(value: Date | string): string {
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value: Date | string): string {
  return dateTimeFmt.format(new Date(value));
}

export function formatTime(value: Date | string): string {
  return timeFmt.format(new Date(value));
}

/** 5600 → "1h 33m" */
export function formatDurationSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** "2h ago" / "3d ago" / "just now" */
export function timeAgo(value: Date | string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/** Countdown like "12:43" or "2d 04:12:33" */
export function formatCountdown(target: Date | string): string {
  const diffMs = new Date(target).getTime() - Date.now();
  if (diffMs <= 0) return "00:00";
  const total = Math.floor(diffMs / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
