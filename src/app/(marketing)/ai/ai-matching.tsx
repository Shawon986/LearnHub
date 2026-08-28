"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BadgeCheck, Sparkles, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Rating } from "@/components/ui/rating";
import { matchTeachers, type TeacherMatch } from "@/lib/actions/ai";
import { formatBDT } from "@/lib/format";

const EXAMPLES = [
  "I need a Python teacher for beginner-level programming",
  "Help me improve my spoken English for job interviews",
  "I want to learn UI design with Figma",
  "Prepare me for IELTS band 7",
];

export function AiMatching({ hasSession }: { hasSession: boolean }) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<TeacherMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(q?: string) {
    const text = (q ?? query).trim();
    if (!text) return;
    setError(null);
    setMatches(null);
    startTransition(async () => {
      const result = await matchTeachers(text);
      if (result.ok) setMatches(result.matches);
      else setError(result.error);
    });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand-fg">
          <Wand2 className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-[16px] font-bold text-foreground">AI teacher matching</h2>
          <p className="text-[12px] text-muted-fg">Describe your goal — get matched with verified teachers.</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder={EXAMPLES[0]}
          aria-label="What do you want to learn?"
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-card px-4 text-[13px] placeholder:text-faint-fg focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        />
        <Button size="lg" loading={pending} leftIcon={<Sparkles className="h-4 w-4" />} onClick={() => run()}>
          Match me
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => {
              setQuery(e);
              run(e);
            }}
            className="rounded-full border border-line bg-card-2 px-3 py-1.5 text-[11px] font-bold text-muted-fg transition-colors hover:text-foreground"
          >
            {e}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-[12px] font-semibold text-danger">{error}</p>
      )}

      {matches && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {matches.map((t) => (
            <Link
              key={t.id}
              href={`/teachers/${t.id}`}
              className="rounded-2xl border border-line bg-card-2/50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <div className="flex items-center gap-3">
                <Avatar name={t.name} src={t.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-[13px] font-bold text-foreground">
                    {t.name}
                    {t.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent" />}
                  </p>
                  <Rating value={t.avgRating} size={11} />
                </div>
                <span className="text-[12px] font-extrabold text-foreground">
                  {t.hourlyRate > 0 ? `${formatBDT(t.hourlyRate)}/hr` : "—"}
                </span>
              </div>
              <p className="mt-2 text-[11px] font-semibold text-accent">{t.reason}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {t.matchedSkills.slice(0, 3).map((s) => (
                  <Badge key={s} variant="brand" size="sm">
                    {s}
                  </Badge>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}

      {!hasSession && (
        <p className="mt-4 text-center text-[12px] font-semibold text-faint-fg">
          <Link href="/login?next=/ai" className="text-brand-fg hover:underline">
            Sign in
          </Link>{" "}
          to get personalized matches.
        </p>
      )}
    </Card>
  );
}
