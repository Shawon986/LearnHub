"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ClipboardList, FileCheck2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { submitAssignment } from "@/lib/actions/enroll";
import { formatDate } from "@/lib/format";
import type { SerializedAssignmentL } from "./learn-shell";

export function AssignmentPanel({ assignment }: { assignment: SerializedAssignmentL }) {
  const [content, setContent] = useState(assignment.mySubmission?.content ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  const mine = assignment.mySubmission;

  function submit() {
    startTransition(async () => {
      const result = await submitAssignment(assignment.id, { content });
      if (result.ok) {
        toast({ title: "Assignment submitted 📝", description: "Your teacher will review it.", variant: "success" });
        router.refresh();
      } else {
        toast({ title: result.error ?? "Could not submit.", variant: "error" });
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-card-2/50 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardList className="h-5 w-5 text-brand-fg" />
          <h2 className="text-[15px] font-bold text-foreground">{assignment.title}</h2>
          {assignment.dueDate && (
            <Badge variant="gold" size="sm">
              <CalendarDays className="h-3 w-3" /> Due {formatDate(assignment.dueDate)}
            </Badge>
          )}
          <Badge variant="neutral" size="sm">Max {assignment.maxScore} points</Badge>
        </div>
        {assignment.description && (
          <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-muted-fg">
            {assignment.description}
          </p>
        )}
      </div>

      {mine ? (
        <div className="space-y-3 rounded-xl border border-line p-5">
          <div className="flex flex-wrap items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-accent" />
            <p className="text-[13px] font-bold text-foreground">Your submission</p>
            <Badge variant={mine.status === "GRADED" ? "success" : "brand"}>
              {mine.status}
            </Badge>
            {mine.score !== null && (
              <Badge variant="success" size="md">
                {mine.score}/{assignment.maxScore}
              </Badge>
            )}
          </div>
          {mine.content && (
            <p className="whitespace-pre-wrap rounded-lg bg-card-2 p-4 text-[13px] leading-relaxed text-muted-fg">
              {mine.content}
            </p>
          )}
          {mine.feedback && (
            <div className="rounded-xl border border-accent/30 bg-accent-soft p-4">
              <p className="text-[11px] font-extrabold uppercase tracking-wide text-accent">
                Teacher feedback
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-foreground">{mine.feedback}</p>
            </div>
          )}
          {mine.status !== "GRADED" && (
            <div className="flex items-center gap-3">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="Update your submission…"
              />
              <Button size="sm" variant="secondary" loading={pending} onClick={submit}>
                Update
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            label="Your answer"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Write your submission here…"
            hint="Minimum 10 characters. You can update it until it's graded."
          />
          <div className="flex justify-end">
            <Button size="lg" loading={pending} onClick={submit} disabled={content.trim().length < 10}>
              Submit assignment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
