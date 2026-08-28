"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { aiRecommendCourses } from "@/lib/actions/ai";

interface Rec {
  courseId: string;
  slug: string;
  title: string;
  categoryName: string;
  reason: string;
}

export function AiRecommendations({ hasSession }: { hasSession: boolean }) {
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      const result = await aiRecommendCourses();
      if (result.ok) setRecs(result.recommendations);
      else setError(result.error);
    });
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-display text-[16px] font-bold text-foreground">AI course recommendations</h2>
            <p className="text-[12px] text-muted-fg">
              Tuned to what you&apos;re learning and interested in.
            </p>
          </div>
        </div>
        {hasSession && (
          <Button variant="secondary" size="sm" loading={pending} leftIcon={<Sparkles className="h-3.5 w-3.5" />} onClick={run}>
            {recs ? "Refresh" : "Recommend for me"}
          </Button>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-[12px] font-semibold text-danger">{error}</p>
      )}

      {recs && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {recs.map((r) => (
            <Link
              key={r.courseId}
              href={`/courses/${r.slug}`}
              className="rounded-2xl border border-line bg-card-2/50 p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift"
            >
              <Badge variant="neutral" size="sm">
                {r.categoryName}
              </Badge>
              <p className="mt-2 line-clamp-2 text-[13px] font-bold text-foreground">{r.title}</p>
              <p className="mt-2 text-[11px] font-semibold text-accent">{r.reason}</p>
            </Link>
          ))}
        </div>
      )}

      {!hasSession && (
        <p className="mt-4 text-center text-[12px] font-semibold text-faint-fg">
          <Link href="/login?next=/ai" className="text-brand-fg hover:underline">
            Sign in
          </Link>{" "}
          to get recommendations based on your learning history.
        </p>
      )}
    </Card>
  );
}
