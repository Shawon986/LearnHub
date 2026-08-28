"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleX, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { submitQuiz } from "@/lib/actions/enroll";
import type { SerializedQuizL } from "./learn-shell";

interface Result {
  score: number;
  passed: boolean;
  total: number;
  correct: number;
  earnedPoints: number;
  totalPoints: number;
}

export function QuizTaker({ quiz, lessonCompleted }: { quiz: SerializedQuizL; lessonCompleted: boolean }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const answeredCount = Object.keys(answers).length;

  function submit() {
    startTransition(async () => {
      const res = await submitQuiz(quiz.id, {
        answers: quiz.questions.map((q) => ({
          questionId: q.id,
          selectedIndex: answers[q.id] ?? 0,
        })),
      });
      if (res.ok) {
        setResult({ score: res.score, passed: res.passed, total: res.total, correct: res.correct, earnedPoints: res.earnedPoints, totalPoints: res.totalPoints });
        toast({
          title: res.passed ? `Passed with ${res.score}% 🎉` : `Scored ${res.score}%`,
          description: res.passed ? "The lesson is now marked complete." : `You need ${quiz.passingScore}% to pass — review and try again.`,
          variant: res.passed ? "success" : "error",
        });
        if (res.passed) router.refresh();
      } else {
        toast({ title: res.error ?? "Could not submit quiz.", variant: "error" });
      }
    });
  }

  if (result) {
    return (
      <div className="space-y-5 rounded-xl border border-line bg-card-2/50 p-6 text-center">
        <div
          className={cn(
            "mx-auto flex h-16 w-16 items-center justify-center rounded-full",
            result.passed ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
          )}
        >
          {result.passed ? <CheckCircle2 className="h-8 w-8" /> : <CircleX className="h-8 w-8" />}
        </div>
        <div>
          <p className="font-display text-2xl font-extrabold text-foreground">{result.score}%</p>
          <p className="mt-1 text-[13px] text-muted-fg">
            {result.correct} of {result.total} correct · {result.earnedPoints}/{result.totalPoints} points ·
            pass mark {quiz.passingScore}%
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setResult(null);
              setAnswers({});
            }}
          >
            Try again
          </Button>
        </div>
        {lessonCompleted && (
          <Badge variant="success" size="md">
            <CheckCircle2 className="h-3.5 w-3.5" /> Lesson complete
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-card-2/50 px-4 py-3">
        <p className="flex items-center gap-2 text-[13px] font-bold text-foreground">
          <ListChecks className="h-4 w-4 text-brand-fg" />
          {quiz.questions.length} questions · pass at {quiz.passingScore}%
          {quiz.timeLimitMinutes && ` · ${quiz.timeLimitMinutes} min`}
        </p>
        <p className="text-[12px] font-semibold text-muted-fg">
          {answeredCount}/{quiz.questions.length} answered
        </p>
      </div>

      <ol className="space-y-5">
        {quiz.questions.map((q, qi) => (
          <li key={q.id} className="rounded-xl border border-line p-5">
            <p className="text-[14px] font-bold text-foreground">
              {qi + 1}. {q.text}
              <span className="ml-2 text-[11px] font-semibold text-faint-fg">({q.points} pt)</span>
            </p>
            <div className="mt-3 space-y-2" role="radiogroup" aria-label={`Answers for question ${qi + 1}`}>
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === oi;
                return (
                  <label
                    key={oi}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 text-[13px] transition-colors",
                      selected
                        ? "border-brand bg-brand-soft font-semibold text-brand-fg"
                        : "border-line text-muted-fg hover:border-line-strong hover:bg-card-2",
                    )}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={selected}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: oi }))}
                      className="h-4 w-4 accent-[var(--brand)]"
                    />
                    {opt}
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex justify-end">
        <Button size="lg" onClick={submit} loading={pending} disabled={answeredCount < quiz.questions.length}>
          {answeredCount < quiz.questions.length ? `Answer all questions (${answeredCount}/${quiz.questions.length})` : "Submit quiz"}
        </Button>
      </div>
    </div>
  );
}
