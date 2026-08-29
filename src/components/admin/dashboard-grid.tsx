"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export interface DashboardWidget {
  key: string;
  title: string;
  content: ReactNode;
  span?: "half" | "full";
}

const STORAGE_KEY = "admin-dashboard-layout";

interface SavedLayout {
  order: string[];
  hidden: string[];
}

function loadLayout(): SavedLayout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedLayout) : null;
  } catch {
    return null;
  }
}

/**
 * Customizable admin dashboard: widgets can be shown/hidden and reordered;
 * the layout persists per browser. Sensible defaults on first visit.
 */
export function DashboardGrid({ widgets }: { widgets: DashboardWidget[] }) {
  const [order, setOrder] = useState<string[]>(() => widgets.map((w) => w.key));
  const [hidden, setHidden] = useState<string[]>([]);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // Restore the saved layout (deferred a frame to keep SSR stable).
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const saved = loadLayout();
      if (saved) {
        setOrder(saved.order);
        setHidden(saved.hidden);
      }
      setReady(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ order, hidden }));
  }, [order, hidden, ready]);

  function move(key: string, dir: -1 | 1) {
    setOrder((prev) => {
      const idx = prev.indexOf(key);
      const swapIdx = idx + dir;
      if (idx === -1 || swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
  }

  function toggleHidden(key: string) {
    setHidden((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  const byKey = new Map(widgets.map((w) => [w.key, w]));
  const visible = order
    .map((key) => byKey.get(key))
    .filter((w): w is DashboardWidget => Boolean(w) && !hidden.includes(w!.key));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          variant="secondary"
          leftIcon={<LayoutGrid className="h-3.5 w-3.5" />}
          onClick={() => setCustomizeOpen(true)}
        >
          Customize dashboard
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {visible.map((w) => (
          <div key={w.key} className={cn(w.span === "full" && "lg:col-span-2")}>
            {w.content}
          </div>
        ))}
        {visible.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-line p-10 text-center text-[13px] text-faint-fg">
            All widgets are hidden — open Customize to bring them back.
          </p>
        )}
      </div>

      <Modal open={customizeOpen} onClose={() => setCustomizeOpen(false)} title="Customize dashboard" description="Show, hide and reorder widgets. Saved per browser.">
        <ul className="space-y-2">
          {order.map((key) => {
            const w = byKey.get(key);
            if (!w) return null;
            const isHidden = hidden.includes(key);
            return (
              <li
                key={key}
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-line p-3 transition-opacity",
                  isHidden && "opacity-50",
                )}
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-foreground">
                  {w.title}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Move ${w.title} up`}
                    onClick={() => move(key, -1)}
                    className="rounded-lg p-1.5 text-faint-fg transition-colors hover:bg-card-2 hover:text-foreground"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${w.title} down`}
                    onClick={() => move(key, 1)}
                    className="rounded-lg p-1.5 text-faint-fg transition-colors hover:bg-card-2 hover:text-foreground"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={isHidden ? `Show ${w.title}` : `Hide ${w.title}`}
                    onClick={() => toggleHidden(key)}
                    className={cn(
                      "rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors",
                      isHidden
                        ? "bg-brand-soft text-brand-fg"
                        : "text-faint-fg hover:bg-card-2 hover:text-foreground",
                    )}
                  >
                    {isHidden ? "Show" : "Hide"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" onClick={() => setCustomizeOpen(false)}>
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
}
