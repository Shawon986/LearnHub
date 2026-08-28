"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Clock, Search, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const RECENT_KEY = "learnhub-recent-searches";

function readRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function SearchBox({
  initialQuery,
  popular,
}: {
  initialQuery?: string;
  popular: string[];
}) {
  const [value, setValue] = useState(initialQuery ?? "");
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Defer one frame so the first render matches the server HTML.
    const raf = requestAnimationFrame(() => setRecent(readRecent()));
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    try {
      const next = [trimmed, ...readRecent().filter((r) => r !== trimmed)].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // localStorage unavailable — non-critical.
    }
    setOpen(false);
  }

  const suggestions = recent.length > 0 ? recent : popular;

  return (
    <form
      ref={rootRef}
      method="GET"
      action="/search"
      className="relative"
      role="search"
      onSubmit={() => submit(value)}
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint-fg" />
      <input
        type="hidden"
        name="type"
        value={new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("type") ?? "courses"}
      />
      <input
        name="q"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setRecent(readRecent());
          setOpen(true);
        }}
        placeholder="Search courses, teachers, live classes…"
        aria-label="Search courses, teachers and live classes"
        className="h-12 w-full rounded-2xl border border-line bg-card pl-11 pr-4 text-sm shadow-soft placeholder:text-faint-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 h-8 -translate-y-1/2 rounded-xl bg-brand px-4 text-[12px] font-bold text-white transition-colors hover:bg-brand-hover"
      >
        Search
      </button>

      {open && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-14 z-30 overflow-hidden rounded-2xl border border-line bg-card p-2 shadow-lift">
          <p className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-faint-fg">
            {recent.length > 0 ? (
              <>
                <Clock className="h-3 w-3" /> Recent searches
              </>
            ) : (
              <>
                <TrendingUp className="h-3 w-3" /> Popular searches
              </>
            )}
          </p>
          {suggestions.map((s) => (
            <Link
              key={s}
              href={`/search?q=${encodeURIComponent(s)}`}
              onClick={() => submit(s)}
              className={cn(
                "block rounded-xl px-3 py-2 text-[13px] font-semibold text-muted-fg transition-colors hover:bg-card-2 hover:text-foreground",
              )}
            >
              {s}
            </Link>
          ))}
        </div>
      )}
    </form>
  );
}
